// PaymentSuccess.js
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

import Header from '../../components/Header/Header';
import Loading from '../../components/Loading/Loading';
import success from '../../assets/images/success.png';

const REACT_APP_API_ADDRESS = import.meta.env.VITE_API_URL;
const REACT_APP_ADDRESS = import.meta.env.VITE_APP_URL;
const VITE_TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY;

export default function PaymentSuccess() {
    const [searchParams, setSearchParams] = useSearchParams();
    const paramPaymentKey = searchParams.get('paymentKey');
    const paramOrderId = searchParams.get('orderId');
    const paramAmount = searchParams.get('amount');

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (
            paramPaymentKey !== null &&
            paramOrderId !== null &&
            paramAmount !== null
        ) {
            let url = `${REACT_APP_API_ADDRESS}/payment`;
            let data = {
                collectionId: paramOrderId,
                paymentKey: paramPaymentKey,
                price: paramAmount,
            };
            let config = { 'Content-Type': 'application/json' };

            setIsLoading(true);
            axios
                .post(url, data, config)
                .then((res) => {
                    console.log(res.data);
                    setIsLoading(false);
                    let url = `${REACT_APP_API_ADDRESS}/execBanana`;
                    let data = {
                        collectionId: paramOrderId,
                    };

                    axios
                        .post(url, data, config)
                        .then((res) => {
                            console.log(res.data);
                        })
                        .catch((error) => {
                            console.log(error);
                        });
                })
                .catch((error) => {
                    console.log(error.response.data.message);
                    setIsLoading(false);
                });
        }
    }, [paramOrderId, paramPaymentKey, paramAmount]);

    const subHeading = () => {
        return (
            <>
                결제가 완료되었습니다
                <br />
                이메일로 전송된 진행 상태를 알 수 있는 링크를 확인해 주세요
            </>
        );
    };

    return (
        <div>
            {isLoading ? (
                <Loading />
            ) : (
                <div className='App'>
                    <Header subHeading={subHeading()} />
                    <div style={{ minHeight: '326px' }} className='container'>
                        <div style={{ marginBottom: '25px' }}>
                            <img src={success} alt='payment successful' />
                        </div>
                        <div className='payment-notification-text'>
                            payment success!
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}