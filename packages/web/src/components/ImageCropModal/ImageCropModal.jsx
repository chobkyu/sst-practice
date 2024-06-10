// ImageCropModal.jsx
import PropTypes from 'prop-types';
import './ImageCropModal.css';
import { useEffect, useState, useRef } from 'react';

export default function ImageCropModal(props) {
    // props
    const originalImage = props.originalImage;
    const croppingImageIndex = props.croppingImageIndex;
    const changeCroppedImage = props.changeCroppedImage;
    const setShowModal = props.setShowModal;
    const offsetXs = props.offsetXs;
    const offsetYs = props.offsetYs;
    const setOffsetXs = props.setOffsetXs;
    const setOffsetYs = props.setOffsetYs;
    const deleteImageFromArray = props.deleteImageFromArray;

    // useState Hooks
    const [defaultLength, setDefaultLength] = useState(512);
    const [canvas, setCanvas] = useState(null);
    const [ctx, setCtx] = useState(null);
    const [image, setImage] = useState(null);
    const [offsetX, setOffsetX] = useState(offsetXs[croppingImageIndex]);
    const [offsetY, setOffsetY] = useState(offsetYs[croppingImageIndex]);
    const [cropMode, setCropMode] = useState('hor');

    // ref current value
    const offsetXRef = useRef(offsetX);
    const offsetYRef = useRef(offsetY);
    const startXRef = useRef(offsetX);
    const startYRef = useRef(offsetY);

    const changeOffsetX = (data) => {
        offsetXRef.current = data;
        setOffsetX(data);
    };
    const changeOffsetY = (data) => {
        offsetYRef.current = data;
        setOffsetY(data);
    };
    const changeStartX = (data) => {
        startXRef.current = data;
    };
    const changeStartY = (data) => {
        startYRef.current = data;
    };

    useEffect(() => {
        const _canvas = document.getElementById('canvas');
        const _ctx = _canvas.getContext('2d');
        const _image = new Image();

        let _cropMode = 'hor';

        _image.onload = function () {
            let baseLength = defaultLength;
            let mappedWidth = baseLength;
            let mappedHeight = baseLength;

            // if image size is smaller than canvas size, set base size to image size
            if (_image.width < baseLength || _image.height < baseLength) {
                baseLength =
                    _image.width > _image.height ? _image.height : _image.width;
            }
            if (_image.width > _image.height) {
                mappedWidth = baseLength;
                mappedHeight = (_image.height / _image.width) * baseLength;
                _cropMode = 'hor';
            } else {
                mappedWidth = (_image.width / _image.height) * baseLength;
                mappedHeight = baseLength;
                _cropMode = 'ver';
            }

            _canvas.width = mappedWidth;
            _canvas.height = mappedHeight;

            _ctx.drawImage(
                _image,
                0,
                0,
                _image.width,
                _image.height,
                0,
                0,
                mappedWidth,
                mappedHeight
            );

            // 이미지가 이미 정방형이어서 crop을 수정할 필요가 없는 경우
            if (offsetX === 0 && offsetY === 0) {
                setOffsetX(0.1);
                setOffsetY(0.1);
            } else {
                setOffsetX((offsetX / _image.width) * mappedWidth);
                setOffsetY((offsetY / _image.height) * mappedHeight);
            }

            setDefaultLength(baseLength);
            setCropMode(_cropMode);

            // 움직이는 투명한 사각형을 캔버스 위에 그려 크롭할 위치를 수정할 수 있도록 함
            const rect = {
                x: 0,
                y: 0,
                width: baseLength,
                height: baseLength,
                startX: 0,
                startY: 0,
                offsetXatStart: 0,
                offsetYatStart: 0,
                isDown: false,
            };

            // PC에서는 mousedown, mouseup, mousemove 이벤트를 사용
            _canvas.addEventListener('mousedown', (e) => {
                rect.isDown = true;
                rect.startX = e.offsetX;
                rect.startY = e.offsetY;
                changeStartX(offsetXRef.current);
                changeStartY(offsetYRef.current);
            });

            _canvas.addEventListener('mouseup', () => {
                rect.isDown = false;
                changeStartX(offsetXRef.current);
                changeStartY(offsetYRef.current);
            });

            _canvas.addEventListener('mousemove', (e) => {
                if (rect.isDown) {
                    // startXRef => 현재 이미지의 크롭 시작 좌표
                    // rect.startX => 크롭을 시작했을 때의 마우스포인터 x 좌표
                    // e.offsetX => 현재 마우스 포인터의 x 좌표
                    if (_cropMode === 'hor') {
                        if (startXRef.current - rect.startX + e.offsetX < 0) {
                            // 왼쪽으로 넘어간 경우
                            rect.x = 0;
                        } else if (
                            _canvas.width <
                            startXRef.current +
                                _canvas.height -
                                rect.startX +
                                e.offsetX
                        ) {
                            // 오른쪽으로 넘어간 경우
                            rect.x = _canvas.width - _canvas.height;
                        } else {
                            // 그 중간
                            rect.x =
                                startXRef.current - rect.startX + e.offsetX;
                        }
                        changeOffsetX(rect.x);
                    } else {
                        if (startYRef.current - rect.startY + e.offsetY < 0) {
                            rect.y = 0;
                        } else if (
                            _canvas.height <
                            startYRef.current +
                                _canvas.width -
                                rect.startY +
                                e.offsetY
                        ) {
                            rect.y = _canvas.height - _canvas.width;
                        } else {
                            rect.y =
                                startYRef.current - rect.startY + e.offsetY;
                        }
                        changeOffsetY(rect.y);
                    }
                }
            });

            // 모바일에서는 touchstart, touchend, touchmove 이벤트를 사용
            _canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                let touch = e.touches[0];
                let mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                });
                _canvas.dispatchEvent(mouseEvent);
            });

            _canvas.addEventListener('touchend', (e) => {
                e.preventDefault();
                let mouseEvent = new MouseEvent('mouseup', {});
                _canvas.dispatchEvent(mouseEvent);
            });

            _canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                let touch = e.touches[0];
                let mouseEvent = new MouseEvent('mousemove', {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                });
                _canvas.dispatchEvent(mouseEvent);
            });
            drawTransparentRect();
        };
        _image.src = originalImage;
        setCanvas(_canvas);
        setCtx(_ctx);
        setImage(_image);
    }, []);

    useEffect(() => {
        drawTransparentRect();
    }, [offsetX, offsetY, ctx]);

    const drawTransparentRect = () => {
        if (ctx === null || canvas === null) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
            image,
            0,
            0,
            image.width,
            image.height,
            0,
            0,
            canvas.width,
            canvas.height
        );
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';

        if (cropMode === 'hor') {
            ctx.fillRect(0, 0, offsetX, canvas.height);
            ctx.fillRect(
                offsetX + canvas.height,
                0,
                canvas.width - canvas.height - offsetX,
                canvas.height
            );
        } else {
            ctx.fillRect(0, 0, canvas.width, offsetY);
            ctx.fillRect(
                0,
                offsetY + canvas.width,
                canvas.width,
                canvas.height - canvas.width - offsetY
            );
        }
        ctx.restore();
    };

    const cropImage = (e) => {
        if (e) e.preventDefault();
        // create virtual canvas to crop original image
        const virtualCanvas = document.createElement('canvas');
        const virtualCtx = virtualCanvas.getContext('2d');
        virtualCanvas.width = 512;
        virtualCanvas.height = 512;
        let sx, sy, sw, sh;
        if (cropMode === 'hor') {
            sx = (offsetX * image.width) / canvas.width;
            sy = 0;
            sw = image.height;
            sh = image.height;
            // change offsetXs and offsetYs with setOffsetXs and setOffsetYs
            let _offsetXs = [...offsetXs];
            _offsetXs[croppingImageIndex] = sx;
            setOffsetXs(_offsetXs);
        } else {
            sx = 0;
            sy = (offsetY * image.height) / canvas.height;
            sw = image.width;
            sh = image.width;
            // change offsetXs and offsetYs with setOffsetXs and setOffsetYs
            let _offsetYs = [...offsetYs];
            _offsetYs[croppingImageIndex] = sy;
            setOffsetYs(_offsetYs);
        }
        virtualCtx.drawImage(image, sx, sy, sw, sh, 0, 0, 512, 512);
        const croppedImageURI = virtualCanvas.toDataURL('image/jpeg');
        changeCroppedImage(croppingImageIndex, croppedImageURI);

        setShowModal(false);
    };

    return (
        <div className='crop-modal'>
            <div
                className='modal-background'
                onClick={() => {
                    setShowModal(false);
                }}
            ></div>

            <div className='modal-body'>
                <div className='modal-content'>
                    <div className='crop-editor-wrapper'>
                        <canvas id='canvas' width='100' height='100'></canvas>
                    </div>
                </div>
                <div className='modal-buttons'>
                    <button
                        onClick={() => {
                            cropImage();
                        }}
                    >
                        CROP
                    </button>
                    <button
                        onClick={() => {
                            deleteImageFromArray(croppingImageIndex);
                        }}
                    >
                        DELETE
                    </button>
                </div>
            </div>
        </div>
    );
}

ImageCropModal.propTypes = {
    originalImage: PropTypes.string.isRequired,
    croppingImageIndex: PropTypes.number.isRequired,
    changeCroppedImage: PropTypes.func.isRequired,
    setShowModal: PropTypes.func.isRequired,
    offsetXs: PropTypes.array.isRequired,
    offsetYs: PropTypes.array.isRequired,
    setOffsetXs: PropTypes.func.isRequired,
    setOffsetYs: PropTypes.func.isRequired,
    deleteImageFromArray: PropTypes.func.isRequired,
};