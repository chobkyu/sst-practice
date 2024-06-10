// Start.js
import './Start.css';
import Header from '../../components/Header/Header'; // path 유의
// Start.js
import { useState } from 'react';
import {
    changeFileToJPG,
    readFileAndResizeImages,
    autoCropImages,
} from '../../utils/utils';
import ImageCropModal from '../../components/ImageCropModal/ImageCropModal';
import CollectionInfo from '../../components/CollectionInfo/CollectionInfo';
import Loading from '../../components/Loading/Loading';

export default function Start() {
    const [photos, setPhotos] = useState([]); // 선택한 파일들
    const [isUploaded, setIsUploaded] = useState(false); // 업로드 확인
    const [croppedImages, setCroppedImages] = useState([]); // 자른 이미지들
    const [offsetXs, setOffsetXs] = useState([]); // x 좌표들
    const [offsetYs, setOffsetYs] = useState([]); // y 좌표들
    const [isLoading, setIsLoading] = useState(false); // 로딩 중인지 아닌지


    const onChangeUploadPhotos = async (e) => {
        let files = Array.from(e.target.files);

        if (files.length > 7 && files.length < 21) {
            setIsLoading(true);
            // 1. 만약 heic 파일이 업로드 되었다면 image type을 jpg로 변환
            let jpegFiles = await Promise.all(
                files.map((file) => {
                    return changeFileToJPG(file);
                })
            );

            // 2. 각 사진의 width, height 중 짧은 것을 512px로 만들어 리사이징하기
            let resizedImageArray = await Promise.all(
                jpegFiles.map((file) => {
                    return readFileAndResizeImages(file);
                })
            );

            // 3. 이미지 가운데를 기준으로 정방형 비율로 crop하기
            let croppedArray = await Promise.all(
                resizedImageArray.map(async (file) => {
                    return autoCropImages(file);
                })
            );

            let croppedImageArray = croppedArray.map((r) => {
                return r.canvas;
            });
            let offsetXArray = croppedArray.map((r) => {
                return r.offsetX;
            });
            let offsetYArray = croppedArray.map((r) => {
                return r.offsetY;
            });

            setIsUploaded(true);
            setPhotos(resizedImageArray);
            setCroppedImages(croppedImageArray);
            setOffsetXs(offsetXArray);
            setOffsetYs(offsetYArray);
            setIsLoading(false);
        } else {
            alert('사진은 8~20장 업로드 해주세요');
        }
    };

    const subHeading = () => {
        return (
            <>
                무엇을 만들고 싶나요?
                <br />
                강아지 혹은 고양이의 사진을 8~20장 업로드 하세요
            </>
        );
    };

    const [showModal, setShowModal] = useState(false); // 모달 띄울지 말지
    const [croppingImageIndex, setCroppingImageIndex] = useState(0); // 현재 crop 중인 이미지 index

    const changeShowModal = () => {
        setShowModal(!showModal);
    };

    const changeCroppingImageIndex = (index) => {
        setCroppingImageIndex(index);
        changeShowModal();
    };

    const changeCroppedImage = (index, croppedImage) => {
        let newCroppedImages = [...croppedImages];
        newCroppedImages[index] = croppedImage;
        setCroppedImages(newCroppedImages);
    };

    const deleteImageFromArray = (index) => {
        let newPhotos = photos;
        let newCroppedImages = croppedImages;
        let newOffsetXs = offsetXs;
        let newOffsetYs = offsetYs;

        newPhotos.splice(index, 1);
        newCroppedImages.splice(index, 1);
        newOffsetXs.splice(index, 1);
        newOffsetYs.splice(index, 1);

        if (newCroppedImages.length < 8) {
            setIsUploaded(false);
            setCroppedImages([]);
            setOffsetXs([]);
            setOffsetYs([]);
            setPhotos([]);
            setShowModal(false);
        } else {
            setPhotos(newPhotos);
            setCroppedImages(newCroppedImages);
            setOffsetXs(newOffsetXs);
            setOffsetYs(newOffsetYs);
            setShowModal(false);
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
                        {isUploaded ? (

                            <CollectionInfo
                                croppedImages={croppedImages}
                                changeCroppingImageIndex={changeCroppingImageIndex}
                                setIsLoading={setIsLoading}
                            />
                        ) : (
                            <div>
                                <label className='button' htmlFor='upload-photos'>
                                    UPLOAD
                                </label>
                                <input
                                    id='upload-photos'
                                    type='file'
                                    multiple
                                    onChange={(e) => onChangeUploadPhotos(e)}
                                    accept='image/x-png,image/jpeg,image/jpg,image/heic'
                                />
                            </div>
                        )}
                    </div>
                    {showModal ? (
                        <ImageCropModal
                            originalImage={photos[croppingImageIndex]}
                            offsetXs={offsetXs}
                            offsetYs={offsetYs}
                            croppingImageIndex={croppingImageIndex}
                            changeCroppedImage={changeCroppedImage}
                            setShowModal={setShowModal}
                            setOffsetXs={setOffsetXs}
                            setOffsetYs={setOffsetYs}
                            deleteImageFromArray={deleteImageFromArray}
                        />
                    ) : null}
                </div>

            )}
        </div>

    )
}