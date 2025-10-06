import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { summariesAPI, authAPI } from '../services/api.jsx';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import UploadModal from './UploadModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { FileText, Download, Eye, Loader2, Clock, Save, X, Sun, Moon, Trash2, Maximize2, User, Settings, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [me, setMe] = useState(null);
  const { theme, toggleTheme } = useTheme();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [duplicateCheck, setDuplicateCheck] = useState(null);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [deletingSummary, setDeletingSummary] = useState(null);
  const [showUploader, setShowUploader] = useState(false);
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    firstName: '',
    lastName: '',
    bio: '',
    phone: '',
    location: ''
  });

  useEffect(() => {
    fetchSummaries();
  }, []);

  useEffect(() => {
    if (activeTab === 'summaries') {
      fetchSummaries();
    }
  }, [activeTab]);

  useEffect(() => {
    const loadMe = async () => {
      try {
        const { user: u } = await authAPI.getMe();
        setMe(u);
      } catch {
        console.error('Failed to fetch me');
      }
    };
    loadMe();
  }, []);

  const fetchSummaries = async () => {
    try {
      const response = await summariesAPI.getSummaries();
      setSummaries(response.summaries);
    } catch {
      toast.error('Failed to fetch summaries');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(selectedFile.type)) {
      toast.error('Only PDF and Word documents are allowed');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setDuplicateCheck(null);

    try {
      const result = await summariesAPI.checkDuplicate(selectedFile);
      setDuplicateCheck(result);
    } catch {
      toast.error('Failed to check for duplicates');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const result = await summariesAPI.uploadFile(file);
      
      if (result.isDuplicate) {
        toast.info('This document was already uploaded before');
      } else {
        toast.success('File uploaded and summarized successfully!');
      }
      
      setFile(null);
      setDuplicateCheck(null);
      fetchSummaries();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (summaryId) => {
    try {
      const blob = await summariesAPI.downloadFile(summaryId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document-${summaryId}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.error('Failed to download file');
    }
  };

  const handleView = async (summaryId) => {
    try {
      const blob = await summariesAPI.viewFile(summaryId);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      toast.error('Failed to view file');
    }
  };

  const handleDelete = async (summaryId) => {
    console.log('=== DELETE OPERATION STARTED ===');
    console.log(`Attempting to delete summary: ${summaryId}`);
    console.log(`Summary ID type: ${typeof summaryId}`);
    console.log(`Summary ID length: ${summaryId?.length}`);
    console.log(`Summary ID value: "${summaryId}"`);
    
    if (!summaryId || summaryId === 'undefined' || summaryId === 'null') {
      console.error('❌ Invalid document ID - stopping delete operation');
      toast.error('Invalid document ID');
      return;
    }
    
    setDeletingSummary(summaryId);
    
    try {
      console.log('🚀 Making API call to delete summary...');
      const result = await summariesAPI.deleteSummary(summaryId);
      console.log('✅ Delete API response:', result);
      
      toast.success('Document deleted successfully');
      console.log('🔄 Refreshing summaries list...');
      await fetchSummaries();
      console.log('✅ Summaries list refreshed');
    } catch (error) {
      console.error('❌ DELETE OPERATION FAILED');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      console.error('Error config:', error.config);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to delete document';
      
      console.error('Final error message to show user:', errorMessage);
      toast.error(errorMessage);
    } finally {
      console.log('🏁 Delete operation completed (success or failure)');
      setDeletingSummary(null);
    }
  };

  const viewFullSummary = (summary) => {
    setSelectedSummary(summary);
  };

  const closeFullSummary = () => {
    setSelectedSummary(null);
  };

  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      // Here you would typically make an API call to update the profile
      // For now, we'll just show a success message
      toast.success('Profile updated successfully!');
      setIsEditingProfile(false);
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const handleCancelEdit = () => {
    setProfileData({
      username: user?.username || '',
      email: user?.email || '',
      firstName: '',
      lastName: '',
      bio: '',
      phone: '',
      location: ''
    });
    setIsEditingProfile(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Enhanced Navigation */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-lg border-b border-white/20 dark:border-gray-700/30 sticky top-0 z-50">
        <div className="w-full pl-5 pr-4 sm:pr-6 lg:pr-8 relative">
          <div className="flex justify-between h-16">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <h1 className="text-2xl font-bold gradient-text">SummerAize</h1>
            </Link>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={toggleTheme}
                size="icon"
                className="group rounded-md bg-gray-800/60 text-white border border-gray-700/60 hover:bg-gray-700/60"
              >
                {theme === 'light' ? (
                  <Moon className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                ) : (
                  <Sun className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={`px-4 py-2 rounded-full transition-all duration-200 ${
                      activeTab === 'profile' 
                        ? 'bg-gray-800/60 text-white border border-gray-700/60 hover:bg-gray-700/60' 
                        : 'bg-gray-800/60 text-white border border-gray-700/60 hover:bg-gray-700/60'
                    }`}
                  >
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mr-2">
                      <span className="text-white text-xs font-semibold">{(me?.username || user?.username || '').charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="font-medium">{me?.username || user?.username}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[220px]">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{me?.username || user?.username}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{me?.email || user?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveTab('profile')}>Profile</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-700">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
            </div>
            <div className="absolute inset-0 flex items-center justify-center gap-3 pointer-events-none">
              <Button
                variant="outline"
                onClick={() => setActiveTab('summaries')}
                className={`px-4 py-2 rounded-lg transition-all duration-200 pointer-events-auto ${
                  activeTab === 'summaries'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg border-transparent'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90 border-transparent'
                }`}
              >
                <FileText className="h-4 w-4 mr-2" />
                Summaries
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'home' && (
          <div className="max-w-5xl mx-auto">
            <div className="text-center py-20 md:py-28 animate-slide-up">
                <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-gray-800/60 text-white text-sm font-semibold mb-6 border border-gray-700/60">✨ <span className="gradient-text ml-1">Powered by AI</span></div>
                <h1 className="text-4xl md:text-6xl font-extrabold leading-tight text-gray-900 dark:text-white">
                  Transform PDFs into <span className="relative inline-block"><span className="relative z-10 px-2 rounded-md bg-pink-200 text-gray-900">concise</span></span> summaries
                </h1>
                <p className="mt-4 md:mt-6 text-gray-600 dark:text-gray-300 text-lg">
                  Get a beautiful summary reel of the document in seconds.
                </p>
                <div className="mt-10">
                  <Button onClick={() => setShowUploader(true)} className="h-12 px-8 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full inline-flex items-center gap-2">
                    Try SummerAize
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
            </div>
            <UploadModal
              open={showUploader}
              onClose={() => setShowUploader(false)}
              file={file}
              onFileChange={handleFileChange}
              onUpload={handleUpload}
              uploading={uploading}
              duplicateCheck={duplicateCheck}
              summaryText={duplicateCheck?.summaryText}
            />
          </div>
        )}

        {activeTab === 'summaries' && (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 gap-8">
              <div className="lg:col-span-2">
                <Card className="glass-card hover-lift animate-slide-up" style={{animationDelay: '0.2s'}}>
                  <CardHeader className="text-center pb-6">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-4">
                      <FileText className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold gradient-text">
                      Your Summaries
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-300 text-lg">
                      View and manage your document summaries
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-purple-600" />
                          <p className="text-gray-600 dark:text-gray-300">Loading your summaries...</p>
                        </div>
                      </div>
                    ) : summaries.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-24 h-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
                          <FileText className="h-12 w-12 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">No summaries yet</h3>
                        <p className="text-gray-500 dark:text-gray-400">Upload your first document to get started!</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {summaries.map((summary, index) => (
                          <Card key={summary._id} className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 hover:border-white/50 dark:hover:border-gray-600/50 transition-all duration-300 hover:shadow-lg animate-fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                                      <FileText className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                      <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                                        {summary.originalName}
                                      </h3>
                                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-4 w-4" />
                                          {formatDate(summary.createdAt)}
                                        </span>
                                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-800 dark:text-gray-100">
                                          {formatFileSize(summary.sizeBytes)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {summary.summaryText ? (
                                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                                      <div className="flex items-start justify-between mb-3">
                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                          <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                                          AI Summary Preview
                                        </h4>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => viewFullSummary(summary)}
                                          className="h-8 px-3 text-xs bg-white/50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600 hover:bg-black/5 dark:hover:bg-gray-700/70 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-500 shrink-0 whitespace-nowrap"
                                        >
                                          <Maximize2 className="h-3 w-3 mr-1" />
                                          Full View
                                        </Button>
                                      </div>
                                      <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed line-clamp-3 font-medium">
                                        {summary.summaryText}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-700">
                                      <div className="flex items-center gap-3">
                                        <Loader2 className="h-5 w-5 text-yellow-600 dark:text-yellow-400 animate-spin" />
                                        <div>
                                          <div className="font-semibold text-yellow-800 dark:text-yellow-200">Generating Summary</div>
                                          <div className="text-sm text-yellow-700 dark:text-yellow-300">AI is processing your document...</div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2 ml-6">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleView(summary._id)}
                                    className="h-10 px-4 bg-white/50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-100 hover:bg-black/5 dark:hover:bg-gray-700/70 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownload(summary._id)}
                                    className="h-10 px-4 bg-white/50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-100 hover:bg-black/5 dark:hover:bg-gray-700/70 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={deletingSummary === summary._id}
                                        className="h-10 px-4 bg-white/50 dark:bg-gray-700/50 hover:bg-white/70 dark:hover:bg-gray-700/70 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700"
                                      >
                                        {deletingSummary === summary._id ? (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4 mr-2" />
                                        )}
                                        Delete
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="glass-card">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">
                                          Delete Document
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
                                          Are you sure you want to delete "{summary.originalName}"? This action cannot be undone and will permanently remove the document from both your account and Google Drive.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel className="border-gray-300">Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleDelete(summary._id)}
                                          className="bg-red-600 hover:bg-red-700 text-white"
                                        >
                                          Delete Document
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          /* Profile Section */
          <div className="max-w-4xl mx-auto">
            <Card className="glass-card hover-lift animate-slide-up">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mb-4">
                  <User className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="text-3xl font-bold gradient-text">
                  User Profile
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300 text-lg">
                  Manage your personal information and account settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isEditingProfile ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl">
                          <Label className="text-sm font-semibold text-gray-600 dark:text-gray-300">Username</Label>
                          <p className="text-lg font-medium text-gray-800 dark:text-gray-200">{profileData.username}</p>
                        </div>
                        <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl">
                          <Label className="text-sm font-semibold text-gray-600 dark:text-gray-300">Email</Label>
                          <p className="text-lg font-medium text-gray-800 dark:text-gray-200">{profileData.email}</p>
                        </div>
                        <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl">
                          <Label className="text-sm font-semibold text-gray-600 dark:text-gray-300">First Name</Label>
                          <p className="text-lg font-medium text-gray-800 dark:text-gray-200">{profileData.firstName || 'Not provided'}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl">
                          <Label className="text-sm font-semibold text-gray-600 dark:text-gray-300">Last Name</Label>
                          <p className="text-lg font-medium text-gray-800 dark:text-gray-200">{profileData.lastName || 'Not provided'}</p>
                        </div>
                        <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl">
                          <Label className="text-sm font-semibold text-gray-600 dark:text-gray-300">Phone</Label>
                          <p className="text-lg font-medium text-gray-800 dark:text-gray-200">{profileData.phone || 'Not provided'}</p>
                        </div>
                        <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl">
                          <Label className="text-sm font-semibold text-gray-600 dark:text-gray-300">Location</Label>
                          <p className="text-lg font-medium text-gray-800 dark:text-gray-200">{profileData.location || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                    {profileData.bio && (
                      <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl">
                        <Label className="text-sm font-semibold text-gray-600 dark:text-gray-300">Bio</Label>
                        <p className="text-lg font-medium text-gray-800 dark:text-gray-200 mt-2">{profileData.bio}</p>
                      </div>
                    )}
                    <div className="flex justify-center pt-4">
                      <Button
                        onClick={() => setIsEditingProfile(true)}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-300 hover:shadow-lg"
                      >
                        <Settings className="h-5 w-5 mr-2" />
                        Edit Profile
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="text-sm font-semibold text-gray-700 dark:text-gray-200">First Name</Label>
                          <Input
                            id="firstName"
                            value={profileData.firstName}
                            onChange={(e) => handleProfileChange('firstName', e.target.value)}
                            className="h-12 bg-white/50 border-white/30 focus:border-purple-500 focus:ring-purple-500/20"
                            placeholder="Enter your first name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Last Name</Label>
                          <Input
                            id="lastName"
                            value={profileData.lastName}
                            onChange={(e) => handleProfileChange('lastName', e.target.value)}
                            className="h-12 bg-white/50 border-white/30 focus:border-purple-500 focus:ring-purple-500/20"
                            placeholder="Enter your last name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Phone</Label>
                          <Input
                            id="phone"
                            value={profileData.phone}
                            onChange={(e) => handleProfileChange('phone', e.target.value)}
                            className="h-12 bg-white/50 border-white/30 focus:border-purple-500 focus:ring-purple-500/20"
                            placeholder="Enter your phone number"
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="location" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Location</Label>
                          <Input
                            id="location"
                            value={profileData.location}
                            onChange={(e) => handleProfileChange('location', e.target.value)}
                            className="h-12 bg-white/50 border-white/30 focus:border-purple-500 focus:ring-purple-500/20"
                            placeholder="Enter your location"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bio" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Bio</Label>
                          <textarea
                            id="bio"
                            value={profileData.bio}
                            onChange={(e) => handleProfileChange('bio', e.target.value)}
                            className="w-full h-24 p-3 bg-white/50 border border-white/30 rounded-lg focus:border-purple-500 focus:ring-purple-500/20 resize-none"
                            placeholder="Tell us about yourself..."
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center gap-4 pt-4">
                      <Button
                        onClick={handleCancelEdit}
                        variant="outline"
                        className="px-8 py-3 border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        <X className="h-5 w-5 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveProfile}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-300 hover:shadow-lg"
                      >
                        <Save className="h-5 w-5 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Full Summary Modal */}
      {selectedSummary && (
        <AlertDialog open={!!selectedSummary} onOpenChange={closeFullSummary}>
          <AlertDialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <div className="flex items-center justify-between">
                <AlertDialogTitle className="flex items-center gap-3 text-2xl">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="gradient-text">{selectedSummary.originalName}</div>
                    <div className="text-sm font-normal text-gray-500 dark:text-gray-400 mt-1">
                      Complete AI-generated summary
                    </div>
                  </div>
                </AlertDialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeFullSummary}
                  className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </AlertDialogHeader>
            <div className="py-6">
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4 text-lg flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                  AI Summary
                </h4>
                <div className="prose prose-lg max-w-none">
                  <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed text-base font-medium">
                    {selectedSummary.summaryText}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {formatDate(selectedSummary.createdAt)}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-800 dark:text-gray-100">
                    {formatFileSize(selectedSummary.sizeBytes)}
                  </span>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleView(selectedSummary._id)}
                    className="bg-white/50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-100 hover:bg-black/5 dark:hover:bg-gray-700/70 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Original
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(selectedSummary._id)}
                    className="bg-white/50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-100 hover:bg-black/5 dark:hover:bg-gray-700/70 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={deletingSummary === selectedSummary._id}
                        className="bg-white/50 dark:bg-gray-700/50 hover:bg-white/70 dark:hover:bg-gray-700/70 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700"
                      >
                        {deletingSummary === selectedSummary._id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="glass-card">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">
                          Delete Document
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
                          Are you sure you want to delete "{selectedSummary.originalName}"? This action cannot be undone and will permanently remove the document from both your account and Google Drive.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-gray-300">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={async () => {
                            try {
                              await handleDelete(selectedSummary._id);
                              closeFullSummary();
                            } catch (error) {
                              console.error('Delete from modal failed:', error);
                            }
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Delete Document
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
            <AlertDialogFooter className="pt-4 bg-transparent">
              <div className="flex justify-center w-full">
                <AlertDialogAction 
                  onClick={closeFullSummary}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-8 py-3 text-lg font-semibold"
                >
                  Close Summary
                </AlertDialogAction>
              </div>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default Dashboard;
