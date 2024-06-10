// utils.js
import Resizer from 'react-image-file-resizer';
import heic2any from 'heic2any';

const changeFileToJPG = async (file) => {
    // 업로드된 이미지 파일이 heic 파일이라면 jpg로 변환
    return new Promise((resolve, reject) => {
        try {
            if (file.type === 'image/heic' || file.type === "") {
                heic2any({
                    blob: file,
                    toType: 'image/jpeg',
                    quality: 1,
                })
                    .then((result) => {
                        let resultFile = new File(
                            [result],
                            file.name.split('.')[0] + '.jpg',
                            {
                                type: 'image/jpeg',
                                lastModified: new Date().getTime(),
                            }
                        );

                        resolve(resultFile);
                    })
                    .catch((error) => {
                        console.log(error);
                        reject(error);
                    });
            } else {
                resolve(file);
            }
        } catch (error) {
            reject(error);
        }
    });
};

const readFileAndResizeImages = async (file) => {
    // 이미지를 읽고 최소 512px로 리사이징
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onloadend = () => {
            let image = new Image();
            image.onload = async function () {
                if (image.width >= image.height) {
                    // 이미지의 가로길이가 세로길이보다 길거나 같을 때 (정방형일때도 포함)
                    // get proportion of the image
                    let proportion = image.width / image.height;
                    // resize image
                    Resizer.imageFileResizer(
                        file,
                        512 * proportion,
                        512,
                        'JPEG',
                        100,
                        0,
                        (uri) => {
                            resolve(uri);
                        },
                        'base64'
                    );
                } else {
                    // 이미지의 세로길이가 가로길이보다 길때
                    // get proportion of the image
                    let proportion = image.height / image.width;
                    // resize image
                    Resizer.imageFileResizer(
                        file,
                        512,
                        512 * proportion,
                        'JPEG',
                        100,
                        0,
                        (uri) => {
                            resolve(uri);
                        },
                        'base64'
                    );
                }
            };
            // 이미지를 로드해라
            image.src = reader.result;
        };
        reader.onerror = reject;
        // 파일을 읽어라
        reader.readAsDataURL(file);
    });
};

const autoCropImages = async (file) => {
    // 이미지를 읽고 가운데를 기준으로 정방형 비율로 crop
    return new Promise((resolve, reject) => {
        try {
            // create canvas and draw file, auto crop the image
            let canvas = document.createElement('canvas');
            let ctx = canvas.getContext('2d');
            let image = new Image();
            image.onload = function () {
                let base_length = 512;
                canvas.width = base_length;
                canvas.height = base_length;
                // center the image
                let offsetX = 0;
                let offsetY = 0;
                // if image size is smaller than canvas size, set base size to image size
                if (image.width < base_length || image.height < base_length) {
                    base_length =
                        image.width > image.height ? image.height : image.width;
                }
                if (image.width > image.height) {
                    offsetX = Math.abs(image.width - base_length) / 2;
                } else {
                    offsetY = Math.abs(image.height - base_length) / 2;
                }
                ctx.drawImage(
                    image,
                    offsetX,
                    offsetY,
                    base_length,
                    base_length,
                    0,
                    0,
                    512,
                    512
                );
                resolve({
                    offsetX,
                    offsetY,
                    canvas: canvas.toDataURL('image/jpeg'),
                });
            };
            image.src = file;
        } catch (error) {
            console.log(error);
            reject(error);
        }
    });
};

export { readFileAndResizeImages, changeFileToJPG, autoCropImages };