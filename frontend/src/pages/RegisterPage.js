// src/pages/RegisterPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Header from '../components/Header';

import './RegisterPage.css';

function RegisterPage() {
  /* ──────────────── state ──────────────── */
  const navigate = useNavigate();
  const API_URL = '/api';

  // nickname
  const [nickname,         setNickname]         = useState('');
  const [nicknameChecked,  setNicknameChecked]  = useState(false);
  const [nicknameAvailable,setNicknameAvailable]= useState(false);
  const [nicknameMsg,      setNicknameMsg]      = useState('');

  // email
  const [email,            setEmail]            = useState('');
  const [emailChecked,     setEmailChecked]     = useState(false);
  const [emailAvailable,   setEmailAvailable]   = useState(false);
  const [emailMsg,         setEmailMsg]         = useState('');

  // password
  const [password,         setPassword]         = useState('');
  const [confirmPassword,  setConfirmPassword]  = useState('');

  // birthdate & gender
  const [birthdate,        setBirthdate]        = useState('');
  const [gender,           setGender]           = useState('');          // male | female | other

  /* ──────────────── helpers ──────────────── */

  /** Generic duplicate-check helper */
  const checkDuplicate = async (endpoint, paramName, value) => {
    const qs = `${paramName}=${encodeURIComponent(value)}`;
    const res = await fetch(`${API_URL}${endpoint}?${qs}`, { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Boolean(data.available);
  };

  const handleNicknameCheck = async () => {
    if (nickname.trim().length < 2) {
      setNicknameMsg('닉네임은 2자 이상이어야 합니다.');
      setNicknameAvailable(false);
      setNicknameChecked(true);
      return;
    }
    setNicknameMsg('확인 중…');
    try {
      const ok = await checkDuplicate('/register/check_nickname', 'nickname', nickname.trim());
      setNicknameAvailable(ok);
      setNicknameMsg(ok ? '사용 가능한 닉네임입니다.' : '이미 사용 중인 닉네임입니다.');
    } catch (err) {
      setNicknameAvailable(false);
      setNicknameMsg('서버 오류로 확인에 실패했습니다.');
      console.error(err);
    }
    setNicknameChecked(true);
  };

  const handleEmailCheck = async () => {
    if (email.trim().length < 5) {               // rudimentary length guard
      setEmailMsg('유효한 이메일을 입력해주세요.');
      setEmailAvailable(false);
      setEmailChecked(true);
      return;
    }
    setEmailMsg('확인 중…');
    try {
      const ok = await checkDuplicate('/register/check_email', 'email', email.trim());
      setEmailAvailable(ok);
      setEmailMsg(ok ? '사용 가능한 이메일입니다.' : '이미 등록된 이메일입니다.');
    } catch (err) {
      setEmailAvailable(false);
      setEmailMsg('서버 오류로 확인에 실패했습니다.');
      console.error(err);
    }
    setEmailChecked(true);
  };

  /* ──────────────── form submit ──────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // front-end guards
    if (!nicknameChecked || !nicknameAvailable) { alert('닉네임 중복 확인을 해주세요.'); return; }
    if (!emailChecked    || !emailAvailable)    { alert('이메일 중복 확인을 해주세요.');  return; }
    if (password !== confirmPassword)           { alert('비밀번호가 일치하지 않습니다.'); return; }
    if (password.length < 6)                    { alert('비밀번호는 6자 이상이어야 합니다.'); return; }
    if (!birthdate || !gender)                  { alert('생년월일과 성별을 모두 입력해주세요.'); return; }

    // map gender ui → backend code
    const genderMap = { male: 'M', female: 'F', other: 'O' };

    const payload = {
      email:        email.trim(),
      password,
      display_name: nickname.trim(),
      bday:         birthdate,
      gender:       genderMap[gender] || null
    };

    try {
      const res = await fetch(`${API_URL}/register`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      /* Successful creation */
      alert('회원가입이 완료되었습니다!');
      navigate('/login');
    } catch (err) {
      console.error(err);
      alert('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  /* ──────────────── render ──────────────── */
  return (
    <div className='registerpage-layout'>
      <Header />

      <div className='main-content-wrapper'>
        {/* ─────── 중앙: 회원가입 폼 ─────── */}
        <main className='middle-register-area'>
          <div className='register-container'>
            <div className='register-box'>
              <h2 className='register-title'>회원가입</h2>

              <form onSubmit={handleSubmit} className='register-form'>
                {/* ─── 이메일 입력 + 중복확인 ─── */}
                <div className='register-input-group'>
                  <div className='form-row'>
                    <label htmlFor='email'>이메일</label>
                    <div className='input-with-button'>
                      <input
                        type='email'
                        id='email'
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setEmailChecked(false); setEmailMsg(''); }}
                        placeholder='이메일을 입력하세요'
                        required
                      />
                      <button
                        type='button'
                        onClick={handleEmailCheck}
                        className='duplicate-check-button'
                        disabled={email.trim().length < 5}
                      >
                        중복확인
                      </button>
                    </div>
                  </div>
                  {emailMsg && (
                    <p className={`message ${emailAvailable ? 'success' : 'error'}`}>
                      {emailMsg}
                    </p>
                  )}
                </div>

                {/* ─── 닉네임 입력 + 중복확인 ─── */}
                <div className='register-input-group'>
                  <div className='form-row'>
                    <label htmlFor='nickname'>닉네임</label>
                    <div className='input-with-button'>
                      <input
                        type='text'
                        id='nickname'
                        value={nickname}
                        onChange={(e) => { setNickname(e.target.value); setNicknameChecked(false); setNicknameMsg(''); }}
                        placeholder='닉네임을 입력하세요 (2자 이상)'
                        required
                      />
                      <button
                        type='button'
                        onClick={handleNicknameCheck}
                        className='duplicate-check-button'
                        disabled={nickname.trim().length < 2}
                      >
                        중복확인
                      </button>
                    </div>
                  </div>
                  {nicknameMsg && (
                    <p className={`message ${nicknameAvailable ? 'success' : 'error'}`}>
                      {nicknameMsg}
                    </p>
                  )}
                </div>

                {/* ─── 비밀번호 입력 ─── */}
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

                {/* ─── 비밀번호 확인 ─── */}
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

                {/* ─── 생년월일 입력 ─── */}
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

                {/* ─── 성별 선택 ─── */}
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
                      <label className='radio-label'>
                        <input
                          type='radio'
                          name='gender'
                          value='other'
                          checked={gender === 'other'}
                          className='radio-gender'
                          onChange={(e) => setGender(e.target.value)}
                          required
                        /> 기타
                      </label>
                    </div>
                  </div>
                </div>

                {/* ─── 가입하기 버튼 ─── */}
                <button type='submit' className='register-submit-button'>
                  가입하기
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default RegisterPage;
