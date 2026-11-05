import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xxvfgnoffomrhtxitqkj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_Q4t2p9WcUBdtUxd7HYV56A_MvxnZRk9';

async function supabaseRequest(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase error (${res.status}): ${errText}`);
  }
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export default async function handler(req, res) {
  // CORS 프리플라이트
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. redirect_url 파싱
  let redirectUrlStr = req.query.redirect_url;
  if (!redirectUrlStr && req.url) {
    try {
      const u = new URL(req.url, 'http://localhost');
      redirectUrlStr = u.searchParams.get('redirect_url');
    } catch {}
  }

  if (!redirectUrlStr) {
    return res.status(400).send('Missing redirect_url parameter');
  }

  // 2. Body 데이터 파싱 (form-urlencoded or JSON)
  let params = {};
  if (typeof req.body === 'object' && req.body !== null && !Buffer.isBuffer(req.body)) {
    params = req.body;
  } else {
    const raw = String(req.body || '');
    const searchParams = new URLSearchParams(raw);
    for (const [k, v] of searchParams.entries()) {
      params[k] = v;
    }
  }

  const authResultCode = params.AuthResultCode;
  const authResultMsg = params.AuthResultMsg || '인증 오류';
  const txTid = params.TxTid;
  const authToken = params.AuthToken;
  const mid = params.MID || process.env.NICEPAY_MID || 'SG1142086m';
  const amt = params.Amt;
  const nextAppURL = params.NextAppURL;
  const moid = params.Moid;

  console.log(`[Nicepay Auth Received] Code=${authResultCode}, Msg=${authResultMsg}, TID=${txTid}, Moid=${moid}`);

  // 인증 실패 시
  if (authResultCode !== '0000') {
    console.error(`나이스페이 인증 실패: ${authResultCode} - ${authResultMsg}`);
    const failUrl = new URL(redirectUrlStr);
    failUrl.searchParams.set('payment', 'fail');
    failUrl.searchParams.set('message', authResultMsg);
    return res.redirect(303, failUrl.toString());
  }

  if (!txTid || !authToken || !amt || !nextAppURL || !moid) {
    console.error('필수 파라미터 누락:', { txTid, authToken, amt, nextAppURL, moid });
    const failUrl = new URL(redirectUrlStr);
    failUrl.searchParams.set('payment', 'fail');
    failUrl.searchParams.set('message', '인증 결과 파라미터가 누락되었습니다.');
    return res.redirect(303, failUrl.toString());
  }

  // 3. 최종 승인 요청 (NextAppURL 호출)
  const merchantKey = process.env.NICEPAY_KEY || 'AaJF/v+0i2QFScNpEl2pNs/5VqTk6rRyh2iwP1RlQ7Oxhta5jNNAitKJpY0Q15Lcm4p8jOD0UZ40ob9XgkJyoA==';

  const now = new Date();
  const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const yyyy = kst.getUTCFullYear();
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kst.getUTCDate()).padStart(2, '0');
  const hh = String(kst.getUTCHours()).padStart(2, '0');
  const min = String(kst.getUTCMinutes()).padStart(2, '0');
  const ss = String(kst.getUTCSeconds()).padStart(2, '0');
  const ediDate = `${yyyy}${mm}${dd}${hh}${min}${ss}`;

  // SignData = Hex(sha256(AuthToken + MID + Amt + EdiDate + MerchantKey))
  const rawSignature = authToken + mid + amt + ediDate + merchantKey;
  const signData = crypto.createHash('sha256').update(rawSignature, 'utf8').digest('hex');

  const approvalForm = new URLSearchParams();
  approvalForm.append('TID', txTid);
  approvalForm.append('AuthToken', authToken);
  approvalForm.append('Amt', amt);
  approvalForm.append('MID', mid);
  approvalForm.append('EdiDate', ediDate);
  approvalForm.append('SignData', signData);
  approvalForm.append('CharSet', 'utf-8');
  approvalForm.append('EdiType', 'JSON');

  let approvalResData = {};
  try {
    const approvalRes = await fetch(nextAppURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: approvalForm.toString()
    });
    const resText = await approvalRes.text();
    console.log(`[Nicepay Approval Raw]`, resText);
    try {
      approvalResData = JSON.parse(resText);
    } catch {
      const sp = new URLSearchParams(resText);
      for (const [k, v] of sp.entries()) approvalResData[k] = v;
    }
  } catch (err) {
    console.error('나이스페이 승인 요청 통신 실패:', err);
    const failUrl = new URL(redirectUrlStr);
    failUrl.searchParams.set('payment', 'fail');
    failUrl.searchParams.set('message', '승인 요청 통신에 실패했습니다.');
    return res.redirect(303, failUrl.toString());
  }

  // 4. 승인 결과 확인
  const resultCode = approvalResData.ResultCode;
  const resultMsg = approvalResData.ResultMsg || '승인 실패';
  const isSuccess = (resultCode === '3001' || resultCode === '0000' || resultCode === '4000' || resultCode === '4100');

  if (!isSuccess) {
    console.error(`나이스페이 승인 실패: ${resultCode} - ${resultMsg}`);
    const failUrl = new URL(redirectUrlStr);
    failUrl.searchParams.set('payment', 'fail');
    failUrl.searchParams.set('message', resultMsg);
    return res.redirect(303, failUrl.toString());
  }

  const finalTid = approvalResData.TID || txTid || '';
  const numericMoid = parseInt(moid, 10);

  // 5. Supabase DB 주문 상태 및 TID 확실한 업데이트
  try {
    const orders = await supabaseRequest(`orders?id=eq.${numericMoid}&select=*`);
    if (orders && orders.length > 0) {
      const order = orders[0];
      let updatedName = order.customer_name || '';
      if (finalTid && !updatedName.includes('||TID:')) {
        updatedName += `||TID:${finalTid}`;
      }

      await supabaseRequest(`orders?id=eq.${numericMoid}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: '준비중',
          tid: finalTid,
          customer_name: updatedName
        })
      });
      console.log(`[Order #${numericMoid}] 상태 '준비중' 및 TID '${finalTid}' 저장 성공!`);

      // 재고 차감 처리
      try {
        const existingLogs = await supabaseRequest(`inventory_logs?reason=like.*%23${numericMoid}*&select=id`);
        if (!existingLogs || existingLogs.length === 0) {
          const parts = updatedName.split('||');
          if (parts.length > 3) {
            const items = JSON.parse(parts[3]);
            if (Array.isArray(items)) {
              for (const item of items) {
                if (item.id && item.qty > 0) {
                  await supabaseRequest('inventory_logs', {
                    method: 'POST',
                    body: JSON.stringify([{
                      product_id: item.id,
                      change_amount: -parseInt(item.qty, 10),
                      reason: `[${item.name || order.product_name}] 홈페이지 주문 결제완료 출고 (주문번호: #${numericMoid})`,
                      manager_name: '시스템(NICEPAY-VERCEL)'
                    }])
                  });
                }
              }
            }
          }
        }
      } catch (invErr) {
        console.error('재고 차감 처리 중 오류:', invErr);
      }

      // 포인트 차감 처리
      if (updatedName.includes('||USED_POINTS:') && !updatedName.includes('||PTS_DEDUCTED')) {
        try {
          const mPts = updatedName.match(/\|\|USED_POINTS:(\d+)/);
          const mUid = updatedName.match(/\|\|USER_ID:([^|]+)/);
          const usedPts = mPts ? parseInt(mPts[1], 10) : 0;
          const uid = mUid ? mUid[1] : '';

          if (usedPts > 0 && uid) {
            const configData = await supabaseRequest('site_configs?key=eq.user_points&select=value');
            const userPointsMap = (configData && configData[0] && configData[0].value) ? configData[0].value : {};
            const curr = userPointsMap[uid] !== undefined ? parseInt(userPointsMap[uid], 10) : 5000;
            const newPts = Math.max(0, curr - usedPts);
            userPointsMap[uid] = newPts;

            await supabaseRequest('site_configs', {
              method: 'POST',
              headers: { 'Prefer': 'resolution=merge-duplicates' },
              body: JSON.stringify({ key: 'user_points', value: userPointsMap })
            });

            // 포인트 로그 기록
            try {
              const logCfg = await supabaseRequest('site_configs?key=eq.point_logs&select=value');
              const logs = (logCfg && logCfg[0] && Array.isArray(logCfg[0].value)) ? logCfg[0].value : [];
              logs.unshift({
                id: 'LOG_' + Date.now(),
                timestamp: new Date().toLocaleString('ko-KR'),
                type: '결제 사용 (-)',
                target: updatedName.split('||')[0],
                details: `-${usedPts.toLocaleString()} P (최종 보유: ${newPts.toLocaleString()} P)`,
                reason: `온라인 결제 포인트 사용 (주문번호: #${numericMoid})`,
                manager: '시스템(NICEPAY-VERCEL)'
              });
              await supabaseRequest('site_configs', {
                method: 'POST',
                headers: { 'Prefer': 'resolution=merge-duplicates' },
                body: JSON.stringify({ key: 'point_logs', value: logs })
              });
            } catch (le) {}

            await supabaseRequest(`orders?id=eq.${numericMoid}`, {
              method: 'PATCH',
              body: JSON.stringify({
                customer_name: `${updatedName}||PTS_DEDUCTED`
              })
            });
          }
        } catch (ptErr) {
          console.error('포인트 차감 처리 오류:', ptErr);
        }
      }
    }
  } catch (dbErr) {
    console.error('주문 DB 업데이트 중 오류:', dbErr);
  }

  // 6. 성공 리다이렉트 (TID와 주문번호를 URL 파라미터에 명시적으로 포함!)
  const successUrl = new URL(redirectUrlStr);
  successUrl.searchParams.set('payment', 'success');
  if (finalTid) successUrl.searchParams.set('tid', finalTid);
  if (moid) successUrl.searchParams.set('moid', String(moid));

  console.log(`[Payment Success Redirect] -> ${successUrl.toString()}`);
  return res.redirect(303, successUrl.toString());
}

