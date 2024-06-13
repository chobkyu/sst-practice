// See.jsx
import './See.css';
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

import Loading from '../../components/Loading/Loading';
import Header from '../../components/Header/Header';
import ResultImageModal from '../../components/ResultImageModal/ResultImageModal';

const REACT_APP_API_ADDRESS = import.meta.env.VITE_API_URL;
const REACT_APP_ADDRESS = import.meta.env.VITE_APP_URL;

export default function See() {
    const navigate = useNavigate();

    const [searchParams, setSearchParams] = useSearchParams();
    const collectionId = searchParams.get('collectionId');
    const secretKey = searchParams.get('secretKey');

    const [isLoading, setIsLoading] = useState(false);
    const [resultImages, setResultImages] = useState([]);

    const [showModal, setShowModal] = useState(false);
    const [modalImage, setModalImage] = useState('');

    useEffect(() => {
        if (collectionId !== null && secretKey !== null) {
            getResultImages();
        }
    }, [collectionId, secretKey]);

    const getResultImages = async () => {
        setIsLoading(true);

        let url = `${REACT_APP_API_ADDRESS}/getImages?collectionId=${collectionId}&secretKey=${secretKey}`;

        axios
            .get(url)
            .then((res) => {
                if (res.data) {
                    console.log(res.data);
                    if (res.data.error) {
                    } else {
                        setResultImages(res.data.urls);
                    }
                    setIsLoading(false);
                }
            })
            .catch((error) => {
                console.log(error.response.data.message);
                if (error.response.data.message === 'image is not ready') {
                    alert(
                        '아직 그림이 준비되지 않았습니다. 잠시 후 다시 시도해 주세요'
                    );
                    navigate(
                        `/status?collectionId=${collectionId}&secretKey=${secretKey}`
                    );
                }
                setIsLoading(false);
            });
    };

    const subHeading = () => {
        return (
            <>
                그림이 모두 완성되었습니다
                <br />
                마음에 드는 이미지를 저장하거나 공유하세요
            </>
        );
    };

    const changeShowModal = () => {
        setShowModal(!showModal);
    };

    const showOnModal = (image) => {
        changeShowModal();
        setModalImage(image);
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
                        <div className='result-image-container'>
                            {resultImages.length === 0
                                ? null
                                : resultImages.map((image, index) => {
                                      return (
                                          <img
                                              onClick={() => showOnModal(image)}
                                              className='result-image'
                                              key={index}
                                              src={image}
                                          />
                                      );
                                  })}
                        </div>
                        {showModal ? (
                            <ResultImageModal
                                modalImage={modalImage}
                                setShowModal={setShowModal}
                            />
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}