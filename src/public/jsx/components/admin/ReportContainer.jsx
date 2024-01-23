import React from 'react';
import GetReport from './GetReport.jsx';

const style = {
  div: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center', // 필요에 따라 정렬을 조절하세요.
  },
};
function ReportContainer() {
  return (
    <div style={style.div}>
      <h1>신고 내역</h1>
      <GetReport />
    </div>
  );
}

export default ReportContainer;