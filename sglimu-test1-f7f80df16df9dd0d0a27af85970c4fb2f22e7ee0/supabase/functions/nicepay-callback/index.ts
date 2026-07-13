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

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  // 쿼리 매개변수에서 원래 주소(redirect_url) 파싱
  const reqUrl = new URL(req.url)
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

      // 4. 주문번호(Moid)를 데이터베이스의 주문 ID(id)와 대조하여 주문 상태를 '준비중'으로 변경
      const { error: dbError } = await supabase
        .from('orders')
        .update({ status: '준비중' })
        .eq('id', numericMoid)

      if (dbError) {
        console.error('주문 데이터베이스 업데이트 실패:', dbError)
      } else {
        console.log(`주문 ID ${numericMoid}의 상태가 '준비중'으로 변경되었습니다.`)

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
