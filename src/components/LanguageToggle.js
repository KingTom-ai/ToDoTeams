import React from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import './LanguageToggle.css';

/**
 * 语言切换组件 - 实现滑动切换效果
 * @param {Object} props - 组件属性
 * @param {Function} props.onChange - 语言切换回调函数
 * @param {string} props.className - 自定义样式类名
 * @param {Object} props.style - 自定义样式对象
 */
const LanguageToggle = ({ onChange, className = '', style = {} }) => {
  const { i18n } = useTranslation();
  const colors = useThemeColors();
  const isEnglish = i18n.language === 'en';

  /**
   * 处理语言切换点击事件
   */
  const handleToggle = () => {
    const newLang = isEnglish ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
    if (onChange) {
      onChange(newLang);
    }
  };

  const toggleStyle = {
    background: isEnglish ? '#1890ff' : '#e0e0e0',
    ...style
  };

  const sliderStyle = {
    left: isEnglish ? 'calc(100% - 22px)' : '2px',
    background: colors.background || 'white'
  };

  const chineseStyle = {
    color: isEnglish ? '#666' : '#1890ff',
    opacity: isEnglish ? 0.6 : 1
  };

  const englishStyle = {
    color: isEnglish ? 'white' : '#666',
    opacity: isEnglish ? 1 : 0.6
  };

  return (
    <button
      className={`language-toggle ${className}`}
      style={toggleStyle}
      onClick={handleToggle}
      title="切换语言 / Switch Language"
      type="button"
    >
      <div className="slider" style={sliderStyle} />
      <span className="option chinese" style={chineseStyle}>中</span>
      <span className="option english" style={englishStyle}>EN</span>
    </button>
  );
};

export default LanguageToggle;