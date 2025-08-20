import React, { useState, useEffect } from 'react';
import { Form, Input, Button, App } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, PhoneOutlined } from '@ant-design/icons';
import axios from '../utils/axiosConfig'; // 使用配置了拦截器的axios
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Register = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [publicKey, setPublicKey] = useState('');

  useEffect(() => {
    /**
     * 函数级注释：生成RSA密钥对
     * 检查浏览器是否支持Web Crypto API，如果不支持则跳过密钥生成
     * 在HTTPS环境或localhost下才能使用crypto.subtle API
     */
    const generateKeys = async () => {
      try {
        // 检查crypto.subtle是否可用
        if (!window.crypto || !window.crypto.subtle) {
          console.warn('Web Crypto API not available. Skipping key generation.');
          message.warning(t('auth.cryptoNotSupported'));
          return;
        }

        // 检查是否在安全上下文中（HTTPS或localhost）
        if (!window.isSecureContext) {
          console.warn('Not in secure context. Crypto operations may not be available.');
          message.warning(t('auth.secureContextRequired'));
          return;
        }

        const keyPair = await window.crypto.subtle.generateKey(
          {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256'
          },
          true,
          ['encrypt', 'decrypt']
        );
        
        const exportedPublicKey = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
        const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedPublicKey)));
        setPublicKey(publicKeyBase64);
        
        // Store private key securely (for demo, using localStorage - not recommended for production)
        const exportedPrivateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
        localStorage.setItem('privateKey', btoa(String.fromCharCode(...new Uint8Array(exportedPrivateKey))));
        
        console.log('RSA key pair generated successfully');
      } catch (error) {
        console.error('Failed to generate keys:', error);
        message.warning(t('auth.keyGenerationFailed'));
        // 继续注册流程，即使密钥生成失败
      }
    };
    
    generateKeys();
  }, [message, t]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // 修改为相对路径，通过代理转发到后端
      await axios.post('/api/auth/register', {
        ...values, publicKey });
      message.success(t('auth.registrationSuccess'));
      navigate('/login');
    } catch (err) {
      message.error(err.response?.data?.error || t('auth.registrationFailed'));
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'left', alignItems: 'right', height: '100vh', width: '100vw', background: 'linear-gradient(to bottom,rgb(178, 162, 211),rgb(99, 74, 141))', backgroundAttachment: 'fixed', backgroundSize: 'cover' }}>
      <Form name="register" onFinish={onFinish} style={{ maxWidth: 300, margin: 'auto' }}>
      <Form.Item name="username" rules={[{ required: true, message: t('auth.pleaseInputUsername') }]}>
        <Input prefix={<UserOutlined />} placeholder={t('auth.username')} />
      </Form.Item>
      <Form.Item name="email" rules={[{ required: true, type: 'email', message: t('auth.pleaseInputValidEmail') }]}>
        <Input prefix={<MailOutlined />} placeholder={t('auth.emailRequired')} />
      </Form.Item>
      <Form.Item name="phone" rules={[{ required: true, message: t('auth.pleaseInputPhone') }]}>
        <Input prefix={<PhoneOutlined />} placeholder={t('auth.phoneNumber')} />
      </Form.Item>
      <Form.Item name="password" rules={[{ required: true, message: t('auth.pleaseInputPassword') }]}>
        <Input.Password prefix={<LockOutlined />} placeholder={t('auth.password')} />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          {t('auth.register')}
        </Button>
      </Form.Item>
      <Form.Item>
        <Button type="primary" onClick={() => navigate('/login')} block>
          {t('auth.backToLogin')}
        </Button>
      </Form.Item>
    </Form>
    </div>
  );
};

export default Register;