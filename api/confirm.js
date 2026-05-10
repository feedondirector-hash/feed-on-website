const TOSS_SECRET_KEY = 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwS7eLwNS5viaQnW9VB5wOJ2ILQYd_4nf0aYgjlYrowkXcf0KC6cZdVVbpF6hYO3pzE/exec';

module.exports = async (req, res) => {
    const { orderId, paymentKey, amount, name, phone, instagram, productName } = req.query;

    if (!orderId || !paymentKey || !amount) {
        return res.redirect('/?payment=fail&reason=missing_params');
    }

    try {
        const confirmResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(TOSS_SECRET_KEY + ':').toString('base64'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                orderId,
                paymentKey,
                amount: parseInt(amount)
            })
        });

        const paymentResult = await confirmResponse.json();

        if (!confirmResponse.ok) {
            console.error('결제 승인 실패:', paymentResult);
            return res.redirect(`/?payment=fail&reason=${encodeURIComponent(paymentResult.code || 'confirm_failed')}`);
        }

        // 스프레드시트 저장 (실패해도 결제 성공으로 진행)
        try {
            const gasData = new URLSearchParams({
                name: name || '',
                phone: phone || '',
                instagram: instagram || '',
                main_concern: `[결제완료] 상품: ${productName || paymentResult.orderName} / 금액: ${paymentResult.totalAmount}원 / 주문ID: ${orderId}`
            });

            await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: gasData.toString()
            });
        } catch (gasError) {
            console.error('스프레드시트 저장 실패:', gasError);
        }

        return res.redirect(`/?payment=success&orderId=${orderId}`);

    } catch (error) {
        console.error('결제 처리 오류:', error);
        return res.redirect('/?payment=fail&reason=server_error');
    }
};
