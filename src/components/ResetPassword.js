import React, { useState } from 'react';
import { Form, Input, Button, App } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import axios from '../utils/axiosConfig';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ResetPassword = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // 修改为相对路径，通过代理转发到后端
      await axios.post('/api/auth/reset-password', {
        token, newPassword: values.newPassword });
      message.success(t('auth.passwordResetSuccess'));
      navigate('/login');
    } catch (err) {
      message.error(err.response?.data?.error || t('auth.resetFailed'));
    }
    setLoading(false);
  };

  if (!token) {
    return <div>{t('auth.invalidResetLink')}</div>;
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Form name="reset-password" onFinish={onFinish} style={{ maxWidth: 300 }}>
        <Form.Item name="newPassword" rules={[{ required: true, message: t('auth.pleaseInputNewPassword') }]}>
          <Input.Password prefix={<LockOutlined />} placeholder={t('auth.newPassword')} />
        </Form.Item>
        <Form.Item name="confirmPassword" dependencies={['newPassword']} rules={[{ required: true, message: t('auth.pleaseConfirmPassword') }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('newPassword') === value) { return Promise.resolve(); } return Promise.reject(new Error(t('auth.passwordsDoNotMatch'))); } })]}>
          <Input.Password prefix={<LockOutlined />} placeholder={t('auth.confirmPassword')} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            {t('auth.resetPassword')}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ResetPassword;