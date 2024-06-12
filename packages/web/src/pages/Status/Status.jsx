import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

import Loading from '../../components/Loading/Loading';
import Header from '../../components/Header/Header';
import Table from '../../components/Table/Table';

const REACT_APP_API_ADDRESS = import.meta.env.VITE_API_URL;
const REACT_APP_ADDRESS = import.meta.env.VITE_APP_URL;

export default function Status() {
    const [searchParams, setSearchParams] = useSearchParams();
    const collectionId = searchParams.get('collectionId');
    const secretKey = searchParams.get('secretKey');

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

    const [productInfoData, setProductInfoData] = useState([]);
    const [statusInfoData, setStatusInfoData] = useState([]);

    useEffect(() => {
        if (collectionId !== undefined && secretKey !== undefined) {
            getCurrentStatus();
        }
    }, [collectionId, secretKey]);

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
                title: '결제 여부',
                content: collectionData.paid ? '결제 완료' : '결제 대기 중',
            },
            {
                title: '이메일',
                content: `${collectionData.price}원`,
            },
            {
                title: '결제 영수증',
                content: collectionData.receipt,
                type: 'receipt',
            },
        ]);

        setStatusInfoData([
            {
                title: '진행 상태',
                content: getProgressValue(),
                type: 'progress',
            },
            {
                title: '결제 완료 시간',
                content: changeDatetimeToString(collectionData.createDatetime),
            },
            {
                title: '그림 생성 시작 시간',
                content: changeDatetimeToString(collectionData.startDatetime),
            },
            {
                title: '그림 생성 완료 시간',
                content: changeDatetimeToString(collectionData.endDatetime),
            },
            {
                title: '',
                content: `${REACT_APP_ADDRESS}/see?collectionId=${collectionId}&secretKey=${secretKey}`,
                type: 'result',
            },
        ]);
    }, [collectionData]);

    const getCurrentStatus = async () => {
        setIsLoading(true);

        let url = `${REACT_APP_API_ADDRESS}/collections?collectionId=${collectionId}`;

        axios
            .get(url)
            .then((res) => {
                if (res.data) {
                    console.log(res.data);
                    setCollectionData(res.data);
                    setIsLoading(false);
                }
            })
            .catch((error) => {
                console.log(error.response.data.message);
                setIsLoading(false);
            });
    };

    const subHeading = () => {
        return (
            <>
                레이몽을 이용해 주셔서 감사합니다
                <br />
                현재 사진을 해석하고 그림을 생성 중 입니다. 진행 상태를
                확인하세요
            </>
        );
    };

    const getProgressValue = () => {
        if (collectionData.startDatetime != '') {
            let startDatetime = collectionData.startDatetime;
            // 한국 시간으로 변경
            startDatetime = new Date(startDatetime);
            startDatetime.setHours(startDatetime.getHours()); // +9 경우에 맞게

            // 예상 완료 시간을 시작 시간 + 10분으로 설정
            let eta = new Date(startDatetime);
            eta.setMinutes(eta.getMinutes() + 10);

            // 현재 시간
            let now = new Date();

            // (현재 시간 - 시작 시간)과 (예상 완료 시간 - 시작 시간)의 비율을 구함
            startDatetime = startDatetime.getTime();
            eta = eta.getTime();
            now = now.getTime();

            let ratio = (now - startDatetime) / (eta - startDatetime);

            if (collectionData.cStatus === '1') {
                // 현재 생성중
                // if ratio is bigger than 1, set it to 0.99
                if (ratio > 1) {
                    ratio = 0.99;
                } else if (ratio < 0) {
                    ratio = 0;
                }
            } else if (collectionData.cStatus === '2') {
                // 완료
                ratio = 1.0;
            } else if (collectionData.cStatus === '3') {
                // 실패
                ratio = 0;
            } else{
                ratio = 0;
            }
            // ratio를 퍼센트로 변환하고 소수점 자리는 없앰
            return Math.floor(ratio * 100);
        } else {
            return 0;
        }
    };

    const changeDatetimeToString = (datetime) => {
        if (datetime !== '') {
            let date = new Date(datetime);
            date.setHours(date.getHours()); // +9 경우에 맞게
            let year = date.getFullYear();
            let month = date.getMonth() + 1;
            let day = date.getDate();
            let hour = date.getHours();
            let min = date.getMinutes();

            let dateString = `${year}년 ${month}월 ${day}일 ${hour}시 ${min}분`;
            return dateString;
        } else {
            return '';
        }
    };

    return (
        <div>
            {isLoading ? (
                <Loading />
            ) : (
                <div className='App'>
                    <div>
                        <Header subHeading={subHeading()} />
                    </div>
                    <div className='container'>
                        <div className='content-wrapper'>
                            <Table
                                tableTitle='product info'
                                tableContent={productInfoData}
                            />
                            <Table
                                tableTitle='status'
                                tableContent={statusInfoData}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}