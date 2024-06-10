// Header.jsx
import './Header.css'; // css 파일 임포트하기
import PropTypes from 'prop-types';

Header.propTypes = {
    subHeading: PropTypes.oneOfType([
        PropTypes.string.isRequired,
        PropTypes.object.isRequired,
    ]),
};

export default function Header(props) {
    return (
        <div>
            <div>
                <h1 className='heading'>RAYMONG</h1>
            </div>
            <div className='subHeading'>{props.subHeading}</div>
        </div>
    );
}
