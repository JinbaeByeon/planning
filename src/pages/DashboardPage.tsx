import React from 'react';
import { Link } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const userId = localStorage.getItem('travel_user_id');

  return (
    <div className="dashboard-container">
      <h1>반가워요, {userId}님!</h1>
      <section>
        <h2>내 여행 목록</h2>
        <p>참여 중인 여행이 없습니다. 새로운 여행을 만들어보세요!</p>
        <button>새 여행 그룹 생성</button>
      </section>
      <section>
        <h2>초대 코드로 참여</h2>
        <input type="text" placeholder="초대 코드 입력" />
        <button>참여하기</button>
      </section>
    </div>
  );
};

export default DashboardPage;
