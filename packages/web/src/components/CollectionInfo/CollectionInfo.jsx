// CollectionInfo.jsx
import PropTypes from 'prop-types';
import './CollectionInfo.css';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const REACT_APP_API_ADDRESS = import.meta.env.VITE_API_URL;
// const REACT_APP_ADDRESS = import.meta.env.VITE_APP_URL;

export default function CollectionInfo(props) {
    const croppedImages = props.croppedImages;
    const changeCroppingImageIndex = props.changeCroppingImageIndex;
    const setIsLoading = props.setIsLoading;

    const [title, setTitle] = useState('');
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [kind, setKind] = useState('');
    const [isAgree, setIsAgree] = useState(false);

    let navigate = useNavigate();

    const isValidEmail = (email) => {
        return /\S+@\S+\.\S+/.test(email);
    };

    const changeEmail = (e) => {
        if (!isValidEmail(e.target.value)) {
            setEmailError('올바른 형식의 이메일을 입력해주세요');
        } else {
            setEmailError('');
        }

        setEmail(e.target.value);
    };

    const changeTitle = (e) => {
        setTitle(e.target.value);
    };

    const changeKind = (kind, e) => {
        setKind(kind);

        // change the background color of the selected kind
        let kinds = document.getElementsByClassName('kind');
        for (let i = 0; i < kinds.length; i++) {
            kinds[i].style.backgroundColor = 'white';
        }
        e.target.style.backgroundColor = '#F2D7C0';
    };

    const changeIsAgree = (e) => {
        setIsAgree(e.target.checked);
    };

    const [disabled, setDisabled] = useState(false);

    useEffect(() => {
        if (
            title === '' ||
            email === '' ||
            kind === '' ||
            !isAgree ||
            !isValidEmail(email)
        ) {
            setDisabled(true);
        } else {
            setDisabled(false);
        }
    }, [title, email, kind, isAgree]);

    const saveData = (e) => {
        e.preventDefault();
        setIsLoading(true);
        // remove 'data:image/jpeg;base64,' from the beginning of the string
        for (let i = 0; i < croppedImages.length; i++) {
            croppedImages[i] = croppedImages[i].replace(
                /^data:image\/[a-z]+;base64,/,
                ''
            );
        }

        let url = `${REACT_APP_API_ADDRESS}/createCollection`;
        let data = {
            name: title,
            email: email,
            kind: kind,
            images: croppedImages,
        };

        let config = { 'Content-Type': 'application/json' };
        console.log(data);
        axios
            .post(url, data, config)
            .then((res) => {
                if (res.data.collectionId) {
                    let newPath = '/order?collectionId=' + res.data.collectionId;
                    navigate(newPath);
                    setIsLoading(false);
                }
            })
            .catch((error) => {
                console.log(error.response.data.message);
            });
    };

    return (
        <div className='collection-info-container'>
            <div className='input-field'>
                <div className='input-info'>
                    <label>타이틀</label>
                </div>
                <input
                    className='custom-input-text'
                    type='text'
                    value={title}
                    onChange={(e) => {
                        changeTitle(e);
                    }}
                    placeholder='ex) 우리집 강아지 뽀삐, 최대 20글자'
                    maxLength={20}
                />
            </div>

            <div className='input-field'>
                <div className='input-info'>
                    <label>이메일</label>
                </div>

                <input
                    className='custom-input-text'
                    type='email'
                    value={email}
                    onChange={(e) => {
                        changeEmail(e);
                    }}
                    placeholder='모든 진행 상황은 이메일로 안내됩니다'
                />
                <div
                    style={{
                        height: emailError !== '' ? '20px' : '0px',
                        fontWeight: 'bold',
                        color: '#F24646',
                        margin: '3px 8px',
                        fontSize: '12px',
                    }}
                >
                    {emailError}
                </div>
            </div>
            <div className='input-field'>
                <div className='input-info'>
                    <label>대상</label>{' '}
                    <span>- 동물의 종류를 선택해주세요</span>
                </div>
                <div style={{ marginTop: '10px' }} className='kind-buttons'>
                    <div
                        className='kind'
                        onClick={(e) => {
                            changeKind('dog', e);
                        }}
                    >
                        강아지
                    </div>
                    <div
                        style={{ marginLeft: '10px' }}
                        className='kind'
                        onClick={(e) => {
                            changeKind('cat', e);
                        }}
                    >
                        고양이
                    </div>
                </div>
            </div>
           
            <div className='input-field'>
                <div className='input-info'>
                    <label>사진</label>
                    <span>
                        - 사진을 클릭하여 대상 중심으로 크롭할 위치를 수정하세요
                    </span>
                </div>
                <div className='upload-image-preview'>
                    {croppedImages.map((file, index) => {
                        return (
                            <img
                                onClick={() => changeCroppingImageIndex(index)}
                                key={index}
                                className='preview-image'
                                src={file}
                            />
                        );
                    })}
                </div>
            </div>
            <div className='input-field'>
                <input
                    id='agree-checkbox'
                    type='checkbox'
                    value={isAgree}
                    onChange={(e) => {
                        changeIsAgree(e);
                    }}
                />
                <label className='checkbox-label' htmlFor='agree-checkbox'>
                    정보성(광고성 X) 이메일 수신에 동의합니다
                </label>
            </div>
            <div className='center-button'>
                <button
                    disabled={disabled}
                    onClick={(e) => {
                        saveData(e);
                    }}
                >
                    확인
                </button>
            </div>
        </div>
    )
}

CollectionInfo.propTypes = {
    croppedImages: PropTypes.array.isRequired,
    changeCroppingImageIndex: PropTypes.func.isRequired,
    setIsLoading: PropTypes.func.isRequired,
};
