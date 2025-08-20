import React, { useState } from 'react';
import { Form, Input, Button, App } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axiosConfig'; // 使用配置了拦截器的axios
import { Modal } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
const Login = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  
    const onFinish = async (values) => {
    setLoading(true);
    try {
      // 修改为相对路径，通过代理转发到后端
      const res = await axios.post('/api/auth/login', values);
      localStorage.setItem('token', res.data.token);
      message.success(t('auth.loginSuccess'));
      navigate('/tasks');
    } catch (err) {
      let errorMessage = t('auth.loginFailed');
      if (err.response) {
        errorMessage = err.response.data?.error || t('auth.loginFailed');
      } else if (err.request) {
        errorMessage = t('auth.noServerResponse');
      } else {
        errorMessage = err.message;
      }
      message.error(errorMessage);
    }
    setLoading(false);
  };

  const handleForgotPassword = () => {
    setForgotModalVisible(true);
  };

  const handleForgotSubmit = async (values) => {
    setLoading(true);
    try {
      // 修改为相对路径，通过代理转发到后端
      await axios.post('/api/auth/forgot-password', { email: values.email });
      message.success(t('auth.resetLinkSent'));
      setForgotModalVisible(false);
    } catch (error) {
      message.error(error.response?.data?.msg || t('auth.resetLinkFailed'));
    }
    setLoading(false);
  };

  const ForgotPasswordForm = ({ onSubmit, loading }) => {
    const [form] = Form.useForm();
    return (
      <Form form={form} onFinish={onSubmit}>
        <Form.Item name="email" rules={[{ required: true, type: 'email', message: t('auth.pleaseInputValidEmail') }]}>
          <Input prefix={<MailOutlined />} placeholder={t('auth.email')} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            {t('auth.sendResetLink')}
          </Button>
        </Form.Item>
      </Form>
    );
  };
//修改log in 界面的渐变色在这边
  return (
    <div style={{ display: 'flex', justifyContent: 'left', alignItems: 'right', height: '100vh', width: '100vw', background: 'linear-gradient(to bottom,rgb(178, 162, 211),rgb(99, 74, 141))', backgroundAttachment: 'fixed', backgroundSize: 'cover' }}>
      <Form name="login" onFinish={onFinish} style={{ maxWidth: 300, margin: 'auto' }}>
        <Form.Item name="identifier" rules={[{ required: true, message: t('auth.pleaseInputEmailOrPhone') }]}>
          <Input prefix={<UserOutlined />} placeholder={t('auth.emailOrPhone')} />
        </Form.Item>
        <Form.Item name="password" rules={[{ required: true, message: t('auth.pleaseInputPassword') }]}>
          <Input.Password prefix={<LockOutlined />} placeholder={t('auth.password')} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            {t('auth.login')}
          </Button>
        </Form.Item>
        <Form.Item>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button type="primary" onClick={() => navigate('/register')} style={{ width: '48%', marginRight: '8px' }}>
              {t('auth.register')}
            </Button>
            <Button type="primary" onClick={handleForgotPassword} style={{ width: '48%' }}>
              {t('auth.forgotPassword')}
            </Button>
          </div>
        </Form.Item>
      </Form>
      <Modal
        title={t('auth.forgotPassword')}
        open={forgotModalVisible}
        onCancel={() => setForgotModalVisible(false)}
        footer={null}
      >
        <ForgotPasswordForm onSubmit={handleForgotSubmit} loading={loading} />
      </Modal>
    </div>
  );
};

export default Login;