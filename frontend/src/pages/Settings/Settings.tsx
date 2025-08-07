import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  User, 
  Save,
  Check,
  Key,
  Loader2
} from 'lucide-react';
import { authApi, settingsApi } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { animations } from '../../utils/animations';

const Settings: React.FC = () => {
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  // Get current user data
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authApi.getCurrentUser(),
  });

  // Get user settings
  const { data: userSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => settingsApi.getSettings(),
  });

  const [settings, setSettings] = useState({
    // User info (read-only)
    username: '',
    email: '',
    
    // API settings
    googleApiKey: '',
  });

  // Update settings when data is loaded
  useEffect(() => {
    if (currentUser?.data) {
      setSettings(prev => ({
        ...prev,
        username: currentUser.data.username,
        email: currentUser.data.email,
      }));
    }
  }, [currentUser]);

  useEffect(() => {
    if (userSettings?.data) {
      const data = userSettings.data;
      setSettings(prev => ({
        ...prev,
        googleApiKey: data.google_api_key || '',
      }));
    }
  }, [userSettings]);

  // Settings update mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (updatedSettings: any) => settingsApi.updateSettings(updatedSettings),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      showSuccess('Settings Updated', 'Your settings have been saved successfully');
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
    },
    onError: (error) => {
      console.error('Failed to save settings:', error);
      showError('Save Failed', 'Unable to save settings. Please try again.');
    },
  });

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Prepare settings data (exclude read-only fields)
      const settingsToSave = {
        google_api_key: settings.googleApiKey,
      };

      await updateSettingsMutation.mutateAsync(settingsToSave);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const isDataLoading = userLoading || settingsLoading;

  return (
    <motion.div 
      className="space-y-6"
      {...animations.pageEnter}
    >
      {/* Header */}
      <motion.div
        {...animations.pageTitle}
      >
        <h1 className="text-4xl font-bold text-gradient">Settings</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Manage your account and API configuration
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Menu */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <div className="glass-card p-6 sticky top-6">
            <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Categories
            </h2>
            <nav className="space-y-2">
              {[
                { id: 'account', name: 'Account', icon: User },
                { id: 'api', name: 'API Configuration', icon: Key },
              ].map((category) => (
                <button
                  key={category.id}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                    e.currentTarget.style.color = 'var(--color-text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                  }}
                >
                  <category.icon className="h-5 w-5" />
                  <span>{category.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </motion.div>

        {/* Settings Content */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Account Settings */}
          <SettingCard title="Account" icon={User}>
            {isDataLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" 
                         style={{ color: 'var(--color-text-secondary)' }}>
                    Username
                  </label>
                  <input
                    type="text"
                    className="input-field w-full bg-gray-50 cursor-not-allowed"
                    value={settings.username}
                    readOnly
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Username cannot be changed
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" 
                         style={{ color: 'var(--color-text-secondary)' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    className="input-field w-full bg-gray-50 cursor-not-allowed"
                    value={settings.email}
                    readOnly
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Email cannot be changed
                  </p>
                </div>
              </div>
            )}
          </SettingCard>

          {/* API Settings */}
          <SettingCard title="API Configuration" icon={Key}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" 
                       style={{ color: 'var(--color-text-secondary)' }}>
                  Google API Key
                </label>
                <input
                  type="password"
                  className="input-field w-full"
                  value={settings.googleApiKey}
                  onChange={(e) => updateSetting('googleApiKey', e.target.value)}
                  placeholder="Enter your Google API key for TTS service"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Required for text-to-speech podcast generation. Get your key from Google Cloud Console.
                </p>
              </div>
            </div>
          </SettingCard>

          {/* Save Button */}
          <motion.button
            onClick={handleSave}
            disabled={isLoading}
            className="btn-accent w-full py-3 flex items-center justify-center space-x-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : saved ? (
              <>
                <Check className="h-5 w-5" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>Save Settings</span>
              </>
            )}
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Setting Card Component
const SettingCard: React.FC<{
  title: string;
  icon: any;
  children: React.ReactNode;
}> = ({ title, icon: Icon, children }) => (
  <div className="glass-card p-6">
    <div className="flex items-center space-x-3 mb-6">
      <div 
        className="p-2 rounded-lg"
        style={{ backgroundColor: 'var(--color-accent-500)' }}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>
      <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        {title}
      </h3>
    </div>
    {children}
  </div>
);

export default Settings;
