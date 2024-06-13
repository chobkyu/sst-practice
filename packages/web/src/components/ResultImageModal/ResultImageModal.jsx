import './ResultImageModal.css';

export default function ResultImageModal(props) {
    const modalImage = props.modalImage;
    const setShowModal = props.setShowModal;

    const changeShowModal = () => {
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
                <img
                    className='modal-result-image'
                    src={modalImage}
                    alt='result-image'
                />
								<div className="mobile-download-guide">
	                  사진을 꾹 눌러 다운로드하세요
                </div>
                <div className="pc-download-guide">
                    이미지를 우클릭 한 후 이미지를 다른 이름으로 저장하세요
                </div>
                <div className='modal-buttons'>
                    <button
                        onClick={() => {
                            changeShowModal();
                        }}
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}