// Order.jsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Table from '../../components/Table/Table';
import Loading from '../../components/Loading/Loading';
import Header from '../../components/Header/Header';
import { loadTossPayments } from '@tosspayments/payment-sdk';

const REACT_APP_API_ADDRESS = import.meta.env.VITE_API_URL;
const REACT_APP_ADDRESS = import.meta.env.VITE_APP_URL;
const VITE_TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY;

export default function Order() {
    const [searchParams, setSearchParams] = useSearchParams();
    const collectionId = searchParams.get('collectionId');

    const [isLoading, setIsLoading] = useState(false);
    const [collectionData, setCollectionData] = useState({
        cStatus: '',
        createDatetime: '',
        email: '',
        endDatetime: '',
        kind: '',
        name: '',
        paid: false,
        price: '',
        receipt: '',
        startDatetime: '',
    });
    const [paidStatus, setPaidStatus] = useState(false);
    const [productInfoData, setProductInfoData] = useState([]);
    const [paymentInfoData, setPaymentInfoData] = useState([]);
    const [price, setPrice] = useState(3900);

    useEffect(() => {
        if (collectionId !== null) {
            checkPaidStatus();
        }
    }, []);

    useEffect(() => {
        setProductInfoData([
            {
                title: '이름',
                content: collectionData.name,
            },
            {
                title: '종류',
                content:
                    collectionData.kind === 'dog'
                        ? '강아지'
                        : collectionData.kind === 'cat'
                        ? '고양이'
                        : '',
            },
            {
                title: '이메일',
                content: collectionData.email,
            },
        ]);

        setPaymentInfoData([{ title: 'TOTAL', content: `${price}원` }]);
    }, [collectionData, price]);


    const checkPaidStatus = async () => {
        setIsLoading(true);

        let url = `${REACT_APP_API_ADDRESS}/collections?collectionId=${collectionId}`;

        axios
            .get(url)
            .then((res) => {
                if (res.data) {
                    console.log(res.data);
                    if (res.data.error) {
                        alert(res.data.error);
                        return;
                    } else {
                        setCollectionData(res.data);

                        let cStatus = parseInt(res.data.cStatus);

                        if (cStatus === 0 || cStatus === 4) {
                            setPaidStatus(false);
                        } else {
                            setPaidStatus(true);
                        }
                    }
                }
                setIsLoading(false);
            })
            .catch((error) => {
                console.log(error.response.data.message);
                setIsLoading(false);
            });
    };

    const processCheckout = () => {
        let clientKey = VITE_TOSS_CLIENT_KEY; // 토스 클라이언트 키

        const successUrl = REACT_APP_ADDRESS + '/payment-success';
        const failUrl = REACT_APP_ADDRESS + '/payment-fail';

        loadTossPayments(clientKey)
            .then((tossPayments) => {
                tossPayments.requestPayment('카드', {
                    // 결제 수단 파라미터
                    // 결제 정보 파라미터
                    amount: price,
                    orderId: collectionId,
                    orderName: `레이몽`,
                    successUrl: successUrl,
                    failUrl: failUrl,
                });
            })
            .catch((error) => {
                console.log(error);
                if (error.code === 'USER_CANCEL') {
                    alert('결제를 취소하였습니다.');
                }
            });
    };

    return (
        <div>
            {isLoading ? (
                <Loading />
            ) : (
                <div className='App'>
                    <div>
                        <Header
                            subHeading={
                                '생성된 결과물을 확인하려면 결제를 진행해 주세요'
                            }
                        />
                    </div>
                    <div className='container'>
                        {paidStatus ? (
                            <div
                                style={{ fontWeight: '500', fontSize: '20px' }}
                            >
                                결제가 완료되었습니다 <br />
                                이메일로 전송된 진행 상태를 알 수 있는 링크를
                                확인해 주세요
                            </div>
                        ) : (
                            <div className='content-wrapper'>
                                <Table
                                    tableTitle={'product info'}
                                    tableContent={productInfoData}
                                />
                                <Table
                                    tableTitle={'payment info'}
                                    tableContent={paymentInfoData}
                                />
                                <div
                                    style={{ margin: '40px 0' }}
                                    className='center-button'
                                >
                                    <button
                                        onClick={() => {
                                            processCheckout();
                                        }}
                                    >
                                        CHECKOUT
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}