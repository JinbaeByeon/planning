import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [userId, setUserId] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (userId.trim()) {
      localStorage.setItem('travel_user_id', userId);
      navigate('/dashboard');
    }
  };

  return (
    <div className="login-container">
      <h1>여행 일정 조율</h1>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="아이디(닉네임) 입력"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <button type="submit">시작하기</button>
      </form>
    </div>
  );
};

export default LoginPage;
