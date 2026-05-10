// 토스페이먼츠 결제 승인 API (Vercel Serverless Function)

const TOSS_SECRET_KEY = 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwS7eLwNS5viaQnW9VB5wOJ2ILQYd_4nf0aYgjlYrowkXcf0KC6cZdVVbpF6hYO3pzE/exec';

export default async function handler(req, res) {
    // GET 요청 처리 (토스페이먼츠 successUrl 리다이렉트)
    const { orderId, paymentKey, amount } = req.query;

    if (!orderId || !paymentKey || !amount) {
        return res.redirect('/?payment=fail&reason=missing_params');
    }

    try {
        // 1. 토스페이먼츠 결제 승인 API 호출
        const confirmResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(TOSS_SECRET_KEY + ':').toString('base64'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                orderId: orderId,
                paymentKey: paymentKey,
                amount: parseInt(amount)
            })
        });

        const paymentResult = await confirmResponse.json();

        if (!confirmResponse.ok) {
            console.error('결제 승인 실패:', paymentResult);
            return res.redirect(`/?payment=fail&reason=${paymentResult.code || 'confirm_failed'}`);
        }

        // 2. 결제 성공 - 스프레드시트에 저장
        try {
            const gasData = new URLSearchParams({
                phone: paymentResult.mobilePhone || '',
                instagram: '', // 프론트에서 localStorage로 전달 필요
                main_concern: `[결제완료] 상품: ${paymentResult.orderName} / 금액: ${paymentResult.totalAmount}원 / 주문ID: ${orderId} / 결제키: ${paymentKey}`
            });

            await fetch(GAS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: gasData.toString()
            });
        } catch (gasError) {
            console.error('스프레드시트 저장 실패:', gasError);
            // 스프레드시트 저장 실패해도 결제는 성공이므로 계속 진행
        }

        // 3. 성공 페이지로 리다이렉트
        return res.redirect(`/?payment=success&orderId=${orderId}`);

    } catch (error) {
        console.error('결제 처리 오류:', error);
        return res.redirect('/?payment=fail&reason=server_error');
    }
}
