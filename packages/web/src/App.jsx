import './App.css';
import Header from './components/Header/Header';
import { useNavigate } from 'react-router-dom'; // import 추가
import heroImage from './assets/images/hero-image.png';

function App() {
  const navigate = useNavigate();

  return (
    <div className='App'>
      <Header subHeading={'AI가 그려주는 동물 아트 한 보따리'} />
      <div style={{ marginTop: '30px' }}>
        <button onClick={() => navigate('/start')}>GET STARTED</button>          
      </div>
      <div className='hero-image-container'>
                <img className='hero-image' src={heroImage} alt='hero-image' />
            </div>
    </div>
  );
}

export default App;