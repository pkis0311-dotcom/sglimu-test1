import crypto from 'crypto';

export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-info, apikey');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { tid, orderId, cancelAmt, cancelMsg } = body;

    if (!tid) {
      return res.status(400).json({ success: false, message: 'TID가 누락되었습니다.' });
    }

    const mid = process.env.NICEPAY_MID || 'SG1142086m';
    const merchantKey = process.env.NICEPAY_KEY || 'AaJF/v+0i2QFScNpEl2pNs/5VqTk6rRyh2iwP1RlQ7Oxhta5jNNAitKJpY0Q15Lcm4p8jOD0UZ40ob9XgkJyoA==';
    const amtStr = String(cancelAmt != null ? cancelAmt : '0');
    const msg = cancelMsg || '고객 주문 취소';

    // 한국 표준시(KST, UTC+9) 기준의 EdiDate 생성 (YYYYMMDDHHMISS)
    const now = new Date();
    const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const yyyy = kst.getUTCFullYear();
    const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(kst.getUTCDate()).padStart(2, '0');
    const hh = String(kst.getUTCHours()).padStart(2, '0');
    const min = String(kst.getUTCMinutes()).padStart(2, '0');
    const ss = String(kst.getUTCSeconds()).padStart(2, '0');
    const ediDate = `${yyyy}${mm}${dd}${hh}${min}${ss}`;

    // SignData = Hex(sha256(MID + CancelAmt + EdiDate + MerchantKey))
    const rawSign = mid + amtStr + ediDate + merchantKey;
    const signData = crypto.createHash('sha256').update(rawSign, 'utf8').digest('hex');

    const form = new URLSearchParams();
    form.append('TID', tid.trim());
    form.append('MID', mid);
    form.append('Moid', String(orderId || ''));
    form.append('CancelAmt', amtStr);
    form.append('CancelMsg', msg);
    form.append('PartialCancelCode', '0'); // 0: 전체취소
    form.append('EdiDate', ediDate);
    form.append('SignData', signData);
    form.append('CharSet', 'utf-8');
    form.append('EdiType', 'JSON');

    console.log(`[Nicepay Cancel Request] TID: ${tid}, Moid: ${orderId}, Amt: ${amtStr}`);

    const response = await fetch('https://pg-api.nicepay.co.kr/webapi/cancel_process.jsp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form.toString()
    });

    const resText = await response.text();
    console.log(`[Nicepay Cancel Raw Response]`, resText);

    let resData = {};
    try {
      resData = JSON.parse(resText);
    } catch {
      const searchParams = new URLSearchParams(resText);
      for (const [key, value] of searchParams.entries()) {
        resData[key] = value;
      }
    }

    const resultCode = String(resData.ResultCode || '');
    const resultMsg = String(resData.ResultMsg || '');

    // 2001: 신용카드 취소성공, 2211: 계좌이체 환불성공, 0000: 성공
    const isSuccess = (resultCode === '2001' || resultCode === '2211' || resultCode === '0000');
    const isAlreadyCancelled = resultMsg.includes('이미 취소') || resultCode === '2012';

    return res.status(200).json({
      success: isSuccess || isAlreadyCancelled,
      resultCode: resultCode,
      resultMsg: resultMsg || (isSuccess ? '취소 성공' : '취소 처리 응답'),
      isAlreadyCancelled: isAlreadyCancelled,
      data: resData
    });
  } catch (err) {
    console.error('[Nicepay Cancel Error]', err);
    return res.status(500).json({
      success: false,
      message: err.message || '나이스페이 취소 요청 처리 중 오류가 발생했습니다.'
    });
  }
}

