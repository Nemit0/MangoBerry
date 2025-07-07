// src/pages/RegisterPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import './RegisterPage.css'; // 회원가입 페이지 스타일 (필요하다면 생성)

function RegisterPage() {
    const navigate = useNavigate();

    // 회원가입 폼 상태 관리
    const [nickname, setNickname] = useState('');
    const [isNicknameChecked, setIsNicknameChecked] = useState(false);
    const [isNicknameAvailable, setIsNicknameAvailable] = useState(false);
    const [nicknameMessage, setNicknameMessage] = useState('');

    const [username, setUsername] = useState(''); // 아이디
    const [isUsernameChecked, setIsUsernameChecked] = useState(false);
    const [isUsernameAvailable, setIsUsernameAvailable] = useState(false);
    const [usernameMessage, setUsernameMessage] = useState('');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); // 비밀번호 확인

    const [birthdate, setBirthdate] = useState(''); // 생년월일 (YYYY-MM-DD)
    const [gender, setGender] = useState(''); // 성별 (male/female)

    // 중복확인 로직 (가상 API 통신)
    const checkDuplicate = (type, value) => {
        // 실제로는 여기에 서버 API 호출 로직이 들어갑니다.
        // 예: axios.get(`/api/checkDuplicate/${type}?value=${value}`)
        return new Promise(resolve => {
            setTimeout(() => { // 가상의 지연 시간
                if (type === 'nickname') {
                    //'taken_nickname'은 사용 불가능한 닉네임 예시
                    if (value === 'taken_nickname' || value.length < 2) {
                        resolve(false); // 사용 불가능
                    } else {
                        resolve(true); // 사용 가능
                    }
                } else if (type === 'username') { // 아이디 중복 확인
                    // 'taken_username'은 사용 불가능한 아이디 예시
                    if (value === 'taken_username' || value.length < 4) {
                        resolve(false); // 사용 불가능
                    } else {
                        resolve(true); // 사용 가능
                    }
                }
            }, 500);
        });
    };
    
    const handleNicknameCheck = async () => {
        if (nickname.length < 2) {
            setNicknameMessage('닉네입은 2자 이상이어야 합니다.');
            setIsNicknameChecked(true);
            setIsNicknameAvailable(false);
            return;
        }
        setNicknameMessage('확인 중...');
        const available = await checkDuplicate('nickname', nickname);
        if (available) {
            setNicknameMessage('사용 가능한 닉네임입니다.');
            setIsNicknameAvailable(true);
        } else {
            setNicknameMessage('이미 사용 중이거나 유효하지 않은 닉네임입니다.');
            setIsNicknameAvailable(false);
        }
        setIsNicknameChecked(true);
    };

    const handleUsernameCheck = async () => {
        if (username.length < 4) {
            setUsernameMessage('아이디는 4자 이상이어야 합니다.');
            setIsUsernameChecked(true);
            setIsUsernameAvailable(false);
            return;
        }
        setUsernameMessage('확인 중...');
        const available = await checkDuplicate('username', username);
        if (available) {
            setUsernameMessage('사용 가능한 아이디입니다.');
            setIsUsernameAvailable(true);
        } else {
            setUsernameMessage('이미 사용 중이거나 유효하지 않은 아이디입니다.');
            setIsUsernameAvailable(false);
        }
        setIsUsernameChecked(true);
    };

    // 입력값 변경 시 중복 확인 상태 초기화
    const handleNicknameChange = (e) => {
        setNickname(e.target.value);
        setIsNicknameChecked(false);
        setIsNicknameAvailable(false);
        setNicknameMessage('');
    };

    const handleUsernameChange = (e) => {
        setUsername(e.target.value);
        setIsUsernameChecked(false);
        setIsUsernameAvailable(false);
        setUsernameMessage('');
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault(); // 폼 제출 시 페이지 새로고침 방지

        // 1. 중복 확인이 완료되었는지, 그리고 사용 가능한지 확인
        if (!isNicknameChecked || !isNicknameAvailable) {
            alert('닉네임 중복 확인을 해주세요.');
            return;
        }
        if (!isUsernameChecked || !isUsernameAvailable) {
            alert('아이디 중복 확인을 해주세요.');
            return;
        }

        // 2. 비밀번호 일치 여부 확인
        if (password !== confirmPassword) {
            alert('비밀번호가 일치하기 않습니다.')
            return;
        }
        if (password.length < 6) { // 비밀번호 최소 길이 설정 (예시)
            alert('비밀번호는 6자 이상이어야 합니다.')
            return;
        }

        // 3. 필수 입력 필드 확인 (생년월일, 성별)
        if (!birthdate || !gender) {
            alert('생년월일과 성별을 모두 입력해주세요.');
            return;
        }

        // 4. 모든 유효성 검사를 통과 후 DB 저장 로직 (가상)
        const userData = {
            nickname,
            username,
            password, // 실제 DB 저장 시에는 비밀번호를 해싱해야 합니다.
            birthdate,
            gender,
            // character: selectedCharacter, // 캐릭터 선택 시 추가
        };

        console.log("회원가입 정보:", userData);

        // 실제로는 여기에 서버 API 호출 (POST /register)
        // 예: await axios.post('/api/register', userData);
        try {
            // 가상의 회원가입 성공 시뮬레이션
            await new Promise(resolve => setTimeout(resolve, 1000));
            alert('회원가입이 완료되었습니다!');
            navigate('/login'); // 회원가입 성공 시 로그인 페이지로 이동
        } catch (error) {
            alert('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
            console.error('회원강비 실패:', error);
        }
    };

    return (
        <div className='registerpage-layout'>
            <Header />
            <div className='main-content-wrapper'>
                <aside className='left-sidebar'>
                    <LeftSidebar />
                </aside>

                <main className='middle-register-area'>
                    <div className='register-container'>
                        <div className='register-box'>
                            <h2 className='register-title'>회원가입</h2>

                            {/* 유저 캐릭터 선택 (보류) */}
                            {/* <div className="input-group character-selection">
                                <label>캐릭터 선택:</label>
                                <div className="character-options">
                                    <button className="character-button">캐릭터 1</button>
                                    <button className="character-button">캐릭터 2</button>
                                </div>
                            </div> */}

                            <form onSubmit={handleRegisterSubmit} className='register-form'>
                                {/* 닉네임 입력 및 중복 확인 */}
                                <div className='register-input-group'>
                                    <div className='form-row'>
                                        <label htmlFor='nickname'>닉네임</label>
                                        <div className='input-with-button'>
                                            <input
                                                type='text'
                                                id='nickname'
                                                value={nickname}
                                                onChange={handleNicknameChange}
                                                placeholder='닉네입을 입력하세요 (2자 이상)'
                                                required 
                                            />
                                            <button
                                                type='button'
                                                onClick={handleNicknameCheck}
                                                className='duplicate-check-button'
                                                disabled={!nickname} // 닉네입이 비어있으면 버튼 비활성화
                                            >
                                                중복확인
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {nicknameMessage && (
                                        <p className={`message ${isNicknameAvailable ? 'success' : 'error'}`}>
                                            {nicknameMessage}
                                        </p>
                                    )}
                                </div>
                                {/* 아이디 입력 및 중복 확인 */}
                                <div className='register-input-group'>
                                    <div className='form-row'>
                                        <label htmlFor='username'>아이디</label>
                                        <div className='input-with-button'>
                                            <input
                                                type='text'
                                                id='username'
                                                value={username}
                                                onChange={handleUsernameChange}
                                                placeholder='아이디를 입력하세요 (4자 이상)'
                                                required
                                            />
                                            <button
                                                type='button'
                                                onClick={handleUsernameCheck}
                                                className='duplicate-check-button'
                                                disabled={!username} // 아이디가 비어있으면 버튼 비활성화
                                            >
                                                중복확인
                                            </button>
                                        </div>
                                    </div>                                  
                                    {usernameMessage && (
                                        <p className={`message ${isUsernameAvailable ? 'success' : 'error'}`}>
                                            {usernameMessage}
                                        </p>
                                    )}
                                </div>

                                {/* 비밀번호 입력 */}
                                <div className='register-input-group'>
                                    <div className='form-row'>
                                        <label htmlFor='password'>비밀번호</label>
                                        <input
                                            type='password'
                                            id='password'
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder='비밀번호를 입력하세요 (6자 이상)'
                                            required
                                        />
                                    </div>
                                    
                                </div>
                                {/* 비밀번호 확인 */}
                                <div className='register-input-group'>
                                    <div className='form-row'>
                                        <label htmlFor='confirmPassword'>비밀번호 확인</label>
                                        <input
                                            type='password'
                                            id='confirmPassword'
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder='비밀번호를 다시 입력하세요'
                                            required
                                        />
                                    </div>                                    
                                    {password && confirmPassword && password !== confirmPassword && (
                                        <p className='message error'>비밀번호가 일치하지 않습니다.</p>
                                    )}
                                </div>

                                {/* 생년월일 입력 */}
                                <div className='register-input-group'>
                                    <div className='form-row'>
                                        <label htmlFor='birthdate'>생년월일</label>
                                        <input
                                            type='date'
                                            id='birthdate'
                                            value={birthdate}
                                            onChange={(e) => setBirthdate(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* 성별 선택 */}
                                <div className='register-input-group'>
                                    <div className='form-row'>
                                        <label>성별</label>
                                        <div className='gender-options'>
                                            <label className='radio-label'>
                                                <input
                                                    type='radio'
                                                    name='gender'
                                                    value='male'
                                                    checked={gender === 'male'}
                                                    className='radio-gender'
                                                    onChange={(e) => setGender(e.target.value)}
                                                    required
                                                /> 남자
                                            </label>
                                            <label className='radio-label'>
                                                <input
                                                    type='radio'
                                                    name='gender'
                                                    value='female'
                                                    checked={gender === 'female'}
                                                    className='radio-gender'
                                                    onChange={(e) => setGender(e.target.value)}
                                                    required
                                                /> 여자
                                            </label>
                                        </div>
                                    </div>

                                    {/* 가입하기 버튼 */}
                                    <button type='submit' className='register-submit-button'>
                                        가입하기
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </main>

                <aside className='right-sidebar'>
                    <RightSidebar />
                </aside>
            </div>
        </div>

        
    );
}

export default RegisterPage;