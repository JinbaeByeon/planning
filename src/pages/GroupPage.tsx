import React from 'react';
import { useParams } from 'react-router-dom';

const GroupPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();

  return (
    <div className="group-container">
      <h1>여행 그룹: {groupId}</h1>
      <nav>
        <button>날짜 조율</button>
        <button>장소 투표</button>
      </nav>
      <div className="content">
        <p>여기에 날짜 캘린더나 장소 투표 목록이 표시됩니다.</p>
      </div>
    </div>
  );
};

export default GroupPage;
