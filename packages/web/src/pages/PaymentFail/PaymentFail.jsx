import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import Header from '../../components/Header/Header';
import fail from '../../assets/images/fail.png';

export default function PaymentFail() {
    const [searchParams, setSearchParams] = useSearchParams();
    const code = searchParams.get('code');

    const [message, setMessage] = useState('결제가 완료되지 않았습니다');

    useEffect(() => {
        if (code !== null) {
            switch (code) {
                case 'PAY_PROCESS_CANCELED':
                    setMessage('결제가 취소되었습니다');
                    break;
                case 'PAY_PROCESS_ABORTED':
                    setMessage(
                        '결제 진행 중 승인에 실패하여 결제가 중단되었습니다'
                    );
                    break;
                case 'REJECT_CARD_COMPANY':
                    setMessage('카드사 승인거절로 결제가 취소되었습니다');
                    break;
                default:
                    setMessage('알 수 없는 이유로 결제가 실패했습니다');
                    break;
            }
        }
    }, [code]);

    const subHeading = () => {
        return (
            <>
                {message}
                <br />
                다시 진행해 주세요
            </>
        );
    };

    return (
        <div className='App'>
            <Header subHeading={subHeading()} />
            <div style={{ minHeight: '326px' }} className='container'>
                <div style={{ marginBottom: '25px' }}>
                    <img src={fail} alt='payment fail' />
                </div>
                <div className='payment-notification-text'>
                    something went wrong
                </div>
            </div>
        </div>
    );
}