import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Zap, ArrowRight } from 'lucide-react';
import { authApi } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // 密码验证函数
  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    // 检查长度（至少8位）
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    // 检查是否包含大写字母
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    // 检查是否包含小写字母
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    // 检查是否包含数字
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    return errors;
  };

  // 处理密码输入变化
  const handlePasswordChange = (password: string) => {
    setFormData({ ...formData, password });
    const errors = validatePassword(password);
    setPasswordErrors(errors);
  };

  const getErrorMessage = (error: any): string => {
    if (error.response?.data?.detail) {
      const detail = error.response.data.detail;
      
      // Handle specific error cases
      if (typeof detail === 'string') {
        switch (detail) {
          case 'Email already registered':
            return 'This email address is already registered. Please use a different email or try logging in.';
          case 'Validation error':
            return 'Please check your input and ensure all fields are valid.';
          default:
            return detail;
        }
      }
      
      // Handle validation errors array
      if (Array.isArray(detail)) {
        return detail.map((err: any) => err.msg || err.detail || err).join(', ');
      }
    }
    
    if (error.response?.status === 409) {
      return 'This email address is already registered. Please use a different email.';
    }
    
    if (error.response?.status === 422) {
      return 'Please check your input. Make sure all fields are filled correctly.';
    }
    
    if (error.response?.status === 500) {
      return 'Server error occurred. Please try again later.';
    }
    
    if (error.code === 'NETWORK_ERROR' || !error.response) {
      return 'Network error. Please check your connection and try again.';
    }
    
    return 'Registration failed. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      showError('Passwords do not match', 'Please ensure both password fields are identical.');
      return;
    }

    // 验证密码强度
    const passwordValidationErrors = validatePassword(formData.password);
    if (passwordValidationErrors.length > 0) {
      showError('Password requirements not met', passwordValidationErrors.join('. ') + '.');
      return;
    }

    // 验证用户名（用户名没有限制，只需要不为空）
    if (formData.username.trim().length === 0) {
      showError('Username required', 'Please enter a username.');
      return;
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showError('Invalid email format', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      await authApi.register(formData.email, formData.password, formData.username);
      
      showSuccess('Account created successfully!', 'Logging you in...');
      
      // Auto login after registration
      try {
        const loginResponse = await authApi.login(formData.email, formData.password);
        localStorage.setItem('access_token', loginResponse.data.access_token);
        
        // Small delay to show success message
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } catch (loginErr) {
        showSuccess('Account created successfully!', 'Please log in to continue.');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      showError('Registration failed', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute -top-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: 'var(--color-accent-500)' }}
        />
        <div 
          className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-15"
          style={{ backgroundColor: 'var(--color-accent-600)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md p-8"
      >
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{ 
              background: `linear-gradient(135deg, var(--color-accent-500), var(--color-accent-600))`,
              boxShadow: 'var(--shadow-glow)'
            }}
          >
            <Zap className="h-8 w-8 text-white" />
          </motion.div>
          
          <h1 className="text-3xl font-bold text-gradient mb-2">Create Account</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Join  and start creating podcasts
          </p>
        </div>

        {/* 注册表单 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 用户名输入 */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Username
              </label>
              <input
                type="text"
                required
                className="input-field w-full"
                placeholder="Enter your username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Username can be any length and contain any characters
              </p>
            </div>

            {/* 邮箱输入 */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Email
              </label>
              <input
                type="email"
                required
                className="input-field w-full"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* 密码输入 */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input-field w-full pr-12"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  style={{ color: 'var(--color-text-muted)' }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              
              {/* 密码强度指示器 */}
              {formData.password && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center space-x-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${passwordErrors.length === 0 ? 'bg-green-500' : passwordErrors.length <= 2 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      Password strength: {passwordErrors.length === 0 ? 'Strong' : passwordErrors.length <= 2 ? 'Medium' : 'Weak'}
                    </span>
                  </div>
                  {passwordErrors.length > 0 && (
                    <div className="space-y-1">
                      {passwordErrors.map((error, index) => (
                        <div key={index} className="text-xs" style={{ color: '#ef4444' }}>
                          • {error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 确认密码输入 */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Confirm Password
              </label>
              <input
                type="password"
                required
                className="input-field w-full"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>

            {/* 注册按钮 */}
            <motion.button
              type="submit"
              disabled={loading}
              className="btn-accent w-full flex items-center justify-center space-x-2 py-3"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
              {!loading && <ArrowRight className="h-5 w-5" />}
            </motion.button>

            {/* 登录链接 */}
            <p 
              className="text-center text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="font-medium hover:underline"
                style={{ color: 'var(--color-accent-400)' }}
              >
                Sign in
              </Link>
            </p>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Register;