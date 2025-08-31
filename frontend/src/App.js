import React from 'react';
import { Routes, Route } from 'react-router-dom';
import InquiryPage from './pages/InquiryPage';
import { ConfigProvider, App as AntdApp } from 'antd';

function App() {
  return (
    <ConfigProvider>
      <AntdApp> {/* antd 的应用级组件，用于弹窗等 */}
        <Routes>
          <Route path="/" element={<InquiryPage />} />
          <Route path="/inquiry/:topic" element={<InquiryPage />} />
        </Routes>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;