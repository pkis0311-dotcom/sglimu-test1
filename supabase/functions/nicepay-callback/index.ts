import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // CORS 프리플라이트 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // 결제 취소 요청 분기 처리
  const reqUrl = new URL(req.url)
  const isCancelAction = reqUrl.searchParams.get('action') === 'cancel'

  if (isCancelAction) {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, message: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    try {
      const body = await req.json()
      const { tid, orderId, cancelAmt, cancelMsg } = body
      if (!tid) {
        return new Response(JSON.stringify({ success: false, message: 'TID가 누락되었습니다.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const mid = Deno.env.get('NICEPAY_MID') || 'SG1142086m'
      const merchantKey = Deno.env.get('NICEPAY_KEY') || 'AaJF/v+0i2QFScNpEl2pNs/5VqTk6rRyh2iwP1RlQ7Oxhta5jNNAitKJpY0Q15Lcm4p8jOD0UZ40ob9XgkJyoA=='
      const amtStr = String(cancelAmt != null ? cancelAmt : '0')
      const msg = cancelMsg || '고객 주문 취소'

      const now = new Date()
      const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000))
      const yyyy = kst.getUTCFullYear()
      const mm = String(kst.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(kst.getUTCDate()).padStart(2, '0')
      const hh = String(kst.getUTCHours()).padStart(2, '0')
      const min = String(kst.getUTCMinutes()).padStart(2, '0')
      const ss = String(kst.getUTCSeconds()).padStart(2, '0')
      const ediDate = `${yyyy}${mm}${dd}${hh}${min}${ss}`

      const rawSignature = mid + amtStr + ediDate + merchantKey
      const msgBuffer = new TextEncoder().encode(rawSignature)
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const signData = hashArray.map(b => b.toString(16).padStart(2, "0")).join("")

      const form = new URLSearchParams()
      form.append('TID', String(tid).trim())
      form.append('MID', mid)
      form.append('Moid', String(orderId || ''))
      form.append('CancelAmt', amtStr)
      form.append('CancelMsg', msg)
      form.append('PartialCancelCode', '0')
      form.append('EdiDate', ediDate)
      form.append('SignData', signData)
      form.append('CharSet', 'utf-8')
      form.append('EdiType', 'JSON')

      const response = await fetch('https://pg-api.nicepay.co.kr/webapi/cancel_process.jsp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: form.toString()
      })

      const resText = await response.text()
      let resData: any = {}
      try {
        resData = JSON.parse(resText)
      } catch {
        const params = new URLSearchParams(resText)
        for (const [k, v] of params.entries()) {
          resData[k] = v
        }
      }

      const resultCode = String(resData.ResultCode || '')
      const resultMsg = String(resData.ResultMsg || '')
      const isSuccess = (resultCode === '2001' || resultCode === '2211' || resultCode === '0000')
      const isAlreadyCancelled = resultMsg.includes('이미 취소') || resultCode === '2012'

      return new Response(JSON.stringify({
        success: isSuccess || isAlreadyCancelled,
        resultCode: resultCode,
        resultMsg: resultMsg || (isSuccess ? '취소 성공' : '취소 응답'),
        isAlreadyCancelled: isAlreadyCancelled,
        data: resData
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } catch (cancelErr: any) {
      return new Response(JSON.stringify({
        success: false,
        message: cancelErr.message || '취소 요청 중 오류 발생'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  // 쿼리 매개변수에서 원래 주소(redirect_url) 파싱
  const redirectUrlStr = reqUrl.searchParams.get('redirect_url')
  
  if (!redirectUrlStr) {
    return new Response('Missing redirect_url parameter', { status: 400, headers: corsHeaders })
  }

  let bodyText = ''
  try {
    bodyText = await req.text()
  } catch (err) {
    console.error('요청 본문을 읽는 중 오류가 발생했습니다:', err)
    return new Response('Failed to read request body', { status: 400, headers: corsHeaders })
  }

  // 나이스페이는 인증 결과를 form-urlencoded 형식으로 POST 전송함
  const params = new URLSearchParams(bodyText)
  const authResultCode = params.get('AuthResultCode')
  const authResultMsg = params.get('AuthResultMsg') || '인증 오류'
  const txTid = params.get('TxTid')
  const authToken = params.get('AuthToken')
  const mid = params.get('MID') || Deno.env.get('NICEPAY_MID') || 'SG1142086m'
  const amt = params.get('Amt')
  const nextAppURL = params.get('NextAppURL')
  const moid = params.get('Moid')

  console.log(`나이스페이 인증 응답: Code=${authResultCode}, Msg=${authResultMsg}, TID=${txTid}, Moid=${moid}`)

  // 1. 인증 결과가 성공이 아닌 경우 원래 사이트로 실패 파라미터 전달 리다이렉트
  if (authResultCode !== '0000') {
    console.error(`나이스페이 인증 실패. Code: ${authResultCode}, Msg: ${authResultMsg}`)
    const failUrl = new URL(redirectUrlStr)
    failUrl.searchParams.set('payment', 'fail')
    failUrl.searchParams.set('message', authResultMsg)
    return Response.redirect(failUrl.toString(), 303)
  }

  if (!txTid || !authToken || !amt || !nextAppURL || !moid) {
    console.error('필수 나이스페이 응답 파라미터 누락:', { txTid, authToken, amt, nextAppURL, moid })
    const failUrl = new URL(redirectUrlStr)
    failUrl.searchParams.set('payment', 'fail')
    failUrl.searchParams.set('message', '인증 결과 파라미터가 누락되었습니다.')
    return Response.redirect(failUrl.toString(), 303)
  }

  // 2. 최종 승인 요청 구성
  const merchantKey = Deno.env.get('NICEPAY_KEY') || 'AaJF/v+0i2QFScNpEl2pNs/5VqTk6rRyh2iwP1RlQ7Oxhta5jNNAitKJpY0Q15Lcm4p8jOD0UZ40ob9XgkJyoA=='
  
  // 한국 표준시(KST, UTC+9) 기준의 EdiDate 생성
  const now = new Date()
  const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000))
  const yyyy = kst.getUTCFullYear()
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(kst.getUTCDate()).padStart(2, '0')
  const hh = String(kst.getUTCHours()).padStart(2, '0')
  const min = String(kst.getUTCMinutes()).padStart(2, '0')
  const ss = String(kst.getUTCSeconds()).padStart(2, '0')
  const ediDate = `${yyyy}${mm}${dd}${hh}${min}${ss}`

  // SignData 계산: Hex(sha256(AuthToken + MID + Amt + EdiDate + MerchantKey))
  const rawSignature = authToken + mid + amt + ediDate + merchantKey
  const msgBuffer = new TextEncoder().encode(rawSignature)
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const signData = hashArray.map(b => b.toString(16).padStart(2, "0")).join("")

  // 승인 폼 데이터 생성
  const approvalForm = new URLSearchParams()
  approvalForm.append('TID', txTid)
  approvalForm.append('AuthToken', authToken)
  approvalForm.append('Amt', amt)
  approvalForm.append('MID', mid)
  approvalForm.append('EdiDate', ediDate)
  approvalForm.append('SignData', signData)
  approvalForm.append('CharSet', 'utf-8')
  approvalForm.append('EdiType', 'JSON')

  console.log(`나이스페이 승인 요청 전송: TID=${txTid}, Moid=${moid}, URL=${nextAppURL}`)

  let approvalResData: any = {}
  try {
    const approvalRes = await fetch(nextAppURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: approvalForm.toString()
    })

    const resText = await approvalRes.text()
    console.log(`나이스페이 승인 결과 Raw:`, resText)

    try {
      approvalResData = JSON.parse(resText)
    } catch {
      // JSON 파싱 실패 시 Key-Value 형태 파싱 시도 (Fallback)
      const searchParams = new URLSearchParams(resText)
      for (const [key, value] of searchParams.entries()) {
        approvalResData[key] = value
      }
    }
  } catch (err) {
    console.error('나이스페이 승인 요청 중 오류 발생:', err)
    const failUrl = new URL(redirectUrlStr)
    failUrl.searchParams.set('payment', 'fail')
    failUrl.searchParams.set('message', '나이스페이 승인 요청 통신 실패')
    return Response.redirect(failUrl.toString(), 303)
  }

  // 3. 승인 결과 분석
  const resultCode = approvalResData.ResultCode
  const resultMsg = approvalResData.ResultMsg || '승인 실패'
  
  // 성공 코드 구분 (카드 결제 성공: 3001, 신규/기타 성공: 0000, 실시간계좌이체: 4000, 가상계좌: 4100 등)
  const isSuccess = resultCode === '3001' || resultCode === '0000' || resultCode === '4000' || resultCode === '4100'

  if (!isSuccess) {
    console.error(`나이스페이 승인 거부. ResultCode: ${resultCode}, Msg: ${resultMsg}`)
    const failUrl = new URL(redirectUrlStr)
    failUrl.searchParams.set('payment', 'fail')
    failUrl.searchParams.set('message', resultMsg)
    return Response.redirect(failUrl.toString(), 303)
  }

  console.log(`나이스페이 결제 승인 완료! TID=${approvalResData.TID}, Moid=${moid}`)

  // 4. Supabase DB 주문 상태 업데이트
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase URL 또는 Service Role Key 환경 변수가 존재하지 않습니다.')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // 1. 주문 ID 정수형 캐스팅
    const numericMoid = parseInt(moid, 10)
    if (isNaN(numericMoid)) {
      throw new Error(`유효하지 않은 주문 ID (Moid): ${moid}`)
    }

    // 2. 기존 주문 정보 조회
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('status, customer_name, product_name')
      .eq('id', numericMoid)
      .single()

    if (fetchErr) {
      console.error('재고 차감을 위한 기존 주문 조회 실패:', fetchErr)
    } else {
      // 3. 중복 재고 차감 여부를 inventory_logs 조회를 통해 확인
      const searchReason = `#${numericMoid}`
      const { data: existingLogs, error: logCheckErr } = await supabase
        .from('inventory_logs')
        .select('id')
        .like('reason', `%${searchReason}%`)

      const isAlreadyDeducted = !logCheckErr && existingLogs && existingLogs.length > 0

      // 4. 주문번호(Moid)를 데이터베이스의 주문 ID(id)와 대조하여 주문 상태를 '준비중'으로 변경 및 TID 저장
      const finalTid = approvalResData.TID || txTid || ''
      const updateData: Record<string, any> = { status: '준비중' }
      if (finalTid) {
        if (order.customer_name && !order.customer_name.includes('||TID:')) {
          updateData.customer_name = `${order.customer_name}||TID:${finalTid}`
        }
      }

      const { error: dbError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', numericMoid)

      if (dbError) {
        console.error('주문 데이터베이스 업데이트 실패:', dbError)
      } else {
        console.log(`주문 ID ${numericMoid}의 상태가 '준비중'으로 변경되었습니다. (TID: ${finalTid})`)

        // 5. 이미 차감되지 않았고 메타데이터가 존재할 경우 재고 차감 실행
        if (!isAlreadyDeducted) {
          const parts = order.customer_name ? order.customer_name.split('||') : []
          if (parts.length > 3) {
            const itemsJson = parts[3]
            try {
              const items = JSON.parse(itemsJson)
              if (Array.isArray(items)) {
                for (const item of items) {
                  const pid = item.id
                  const qty = parseInt(item.qty) || 0
                  const pName = item.name || order.product_name

                  if (pid && qty > 0) {
                    // inventory_logs 삽입 (트리거가 products 테이블 stock을 자동으로 차감함)
                    const { error: logErr } = await supabase.from('inventory_logs').insert([{
                      product_id: pid,
                      change_amount: -qty,
                      reason: `[${pName}] 홈페이지 주문 결제완료 출고 (주문번호: #${numericMoid})`,
                      manager_name: '시스템(NICEPAY)'
                    }])
                    if (logErr) {
                      console.error(`재고 로그 생성 실패 (제품 ID: ${pid}):`, logErr)
                    } else {
                      console.log(`제품 ID ${pid} 재고 차감 및 로그 생성 완료`)
                    }
                  }
                }
              }
            } catch (jsonErr) {
              console.error('주문 품목 메타데이터 파싱 중 오류:', jsonErr)
            }
          }
        } else {
          console.log(`주문 ID ${numericMoid}는 이미 재고가 차감되어 작업을 건너뜁니다.`)
        }

        // 6. 사용 포인트 차감 처리 (아직 차감되지 않은 경우)
        if (order.customer_name && order.customer_name.includes('||USED_POINTS:') && !order.customer_name.includes('||PTS_DEDUCTED')) {
          try {
            const mPts = order.customer_name.match(/\|\|USED_POINTS:(\d+)/)
            const mUid = order.customer_name.match(/\|\|USER_ID:([^|]+)/)
            const usedPts = mPts ? parseInt(mPts[1], 10) : 0
            const uid = mUid ? mUid[1] : ''

            if (usedPts > 0 && uid) {
              const { data: configData } = await supabase.from('site_configs').select('value').eq('key', 'user_points').single()
              const userPointsMap = (configData && configData.value && typeof configData.value === 'object') ? configData.value : {}
              const currentPts = userPointsMap[uid] !== undefined ? parseInt(userPointsMap[uid], 10) : 5000
              const newPts = Math.max(0, currentPts - usedPts)
              userPointsMap[uid] = newPts
              await supabase.from('site_configs').upsert({ key: 'user_points', value: userPointsMap })

              // 포인트 로그 기록
              try {
                const { data: logCfg } = await supabase.from('site_configs').select('value').eq('key', 'point_logs').single()
                const logs = logCfg && Array.isArray(logCfg.value) ? logCfg.value : []
                logs.unshift({
                  id: 'LOG_' + Date.now(),
                  timestamp: new Date().toLocaleString('ko-KR'),
                  type: '결제 사용 (-)',
                  target: `${order.customer_name.split('||')[0]}`,
                  details: `-${usedPts.toLocaleString()} P (최종 보유: ${newPts.toLocaleString()} P)`,
                  reason: `온라인 결제 포인트 사용 (주문번호: #${numericMoid})`,
                  manager: '시스템(NICEPAY-EDGE)'
                })
                await supabase.from('site_configs').upsert({ key: 'point_logs', value: logs })
              } catch (le) {}

              await supabase.from('orders').update({
                customer_name: `${order.customer_name}||PTS_DEDUCTED`
              }).eq('id', numericMoid)
              console.log(`주문 ID ${numericMoid} 포인트 ${usedPts}P 차감 완료 (유저: ${uid})`)
            }
          } catch (pErr) {
            console.error('포인트 차감 처리 중 오류:', pErr)
          }
        }
      }
    }

  } catch (dbErr) {
    console.error('주문 정보 업데이트 처리 중 치명적 오류:', dbErr)
  }

  // 5. 원래 웹페이지로 성공 리다이렉트
  const successUrl = new URL(redirectUrlStr)
  successUrl.searchParams.set('payment', 'success')
  return Response.redirect(successUrl.toString(), 303)
})
