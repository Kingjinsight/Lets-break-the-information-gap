import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Zap, ArrowRight } from 'lucide-react';
import { authApi } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.login(formData.email, formData.password);
      localStorage.setItem('access_token', response.data.access_token);
      
      showSuccess('Login successful!', 'Welcome back to Let\'s break the information gap');
      
      // Small delay to show success message
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err: any) {
      console.error('Login error:', err);
      
      let errorMessage = 'Login failed. Please try again.';
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') {
          switch (detail) {
            case 'Incorrect email or password':
              errorMessage = 'Invalid email or password. Please check your credentials and try again.';
              break;
            case 'Could not validate credentials':
              errorMessage = 'Authentication failed. Please try again.';
              break;
            default:
              errorMessage = detail;
          }
        }
      } else if (err.response?.status === 401) {
        errorMessage = 'Invalid email or password. Please check your credentials.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (err.code === 'NETWORK_ERROR' || !err.response) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      showError('Login Failed', errorMessage);
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
          
          <h1 className="text-3xl font-bold text-gradient mb-2">Welcome Back</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Sign in to your account
          </p>
        </div>

        {/* 登录表单 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
            </div>

            {/* 登录按钮 */}
            <motion.button
              type="submit"
              disabled={loading}
              className="btn-accent w-full flex items-center justify-center space-x-2 py-3"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>{loading ? 'Signing In...' : 'Sign In'}</span>
              {!loading && <ArrowRight className="h-5 w-5" />}
            </motion.button>

            {/* 注册链接 */}
            <p 
              className="text-center text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Don't have an account?{' '}
              <Link 
                to="/register" 
                className="font-medium hover:underline"
                style={{ color: 'var(--color-accent-400)' }}
              >
                Sign up
              </Link>
            </p>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;