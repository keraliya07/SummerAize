import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { summariesAPI, authAPI } from '../services/api.jsx';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import UploadModal from './UploadModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { FileText, Download, Eye, Loader2, Clock, X, Sun, Moon, Trash2, Maximize2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import logo from '../assets/logo.svg';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [me, setMe] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [duplicateCheck, setDuplicateCheck] = useState(null);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [deletingSummary, setDeletingSummary] = useState(null);
  const [showUploader, setShowUploader] = useState(false);

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

  useEffect(() => {
    if (!selectedSummary) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeFullSummary();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedSummary]);

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
      
      // keep preview data so modal can show filename and size
      setDuplicateCheck({ ...result, originalName: file.name, sizeBytes: file.size });
      setFile(null);
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
    if (!summaryId || summaryId === 'undefined' || summaryId === 'null') {
      toast.error('Invalid document ID');
      return;
    }
    
    if (deletingSummary) {
      return;
    }
    
    setDeletingSummary(summaryId);
    
    try {
      await summariesAPI.deleteSummary(summaryId);
      toast.success('Document deleted successfully');
      await fetchSummaries();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to delete document';
      toast.error(errorMessage);
    } finally {
      setDeletingSummary(null);
    }
  };

  const viewFullSummary = (summary) => {
    setSelectedSummary(summary);
  };

  const closeFullSummary = () => {
    setSelectedSummary(null);
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

  const openUploaderFresh = () => {
    setFile(null);
    setDuplicateCheck(null);
    setUploading(false);
    setShowUploader(true);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Enhanced Navigation */}
      <nav className="bg-gray-900/80 backdrop-blur-lg shadow-lg border-b border-gray-700/30 sticky top-0 z-50">
        <div className="w-full pl-5 pr-4 sm:pr-6 lg:pr-8 relative">
          <div className="flex justify-between h-16">
            <Link 
              to="/dashboard" 
              onClick={() => setActiveTab('home')}
              className="flex items-center space-x-2.5 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center flex-shrink-0 relative">
                <img 
                  src={logo} 
                  alt="SummerAize Logo" 
                  className="w-full h-full object-contain"
                  style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }}
                  onError={(e) => {
                    console.error('Logo failed to load:', logo);
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <h1 className="hidden md:block text-xl sm:text-2xl font-bold gradient-text">SummerAize</h1>
            </Link>
            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="px-2 md:px-4 py-2 rounded-full transition-all duration-200 bg-gray-800/60 text-white border border-gray-700/60 hover:bg-gray-700/60"
                  >
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center md:mr-2">
                      <span className="text-white text-xs font-semibold">{(me?.username || user?.username || '').charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="hidden md:inline font-medium">{me?.username || user?.username}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[220px]">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{me?.username || user?.username}</span>
                      <span className="text-xs text-gray-400">{me?.email || user?.email}</span>
                    </div>
                  </DropdownMenuLabel>
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
                className={`px-3 md:px-4 py-2 rounded-lg transition-all duration-200 pointer-events-auto text-sm md:text-base ${
                  activeTab === 'summaries'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg border-transparent'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90 border-transparent'
                }`}
              >
                <FileText className="h-3 w-3 md:h-4 md:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Summaries</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'home' && (
          <div className="max-w-5xl mx-auto">
            <div className="text-center py-12 md:py-20 lg:py-28 animate-slide-up px-4">
                <div className="inline-flex items-center px-3 md:px-4 py-1.5 rounded-full bg-gray-800/60 text-white text-xs md:text-sm font-semibold mb-4 md:mb-6 border border-gray-700/60">✨ <span className="gradient-text ml-1">Powered by AI</span></div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-extrabold leading-tight text-white px-2">
                  Transform PDFs into <span className="relative inline-block"><span className="relative z-10 px-1 md:px-2 rounded-md bg-pink-200 text-gray-900">concise</span></span> summaries
                </h1>
                <p className="mt-3 md:mt-4 lg:mt-6 text-gray-300 text-base md:text-lg px-2">
                  Get a beautiful summary reel of the document in seconds.
                </p>
                <div className="mt-6 md:mt-8 lg:mt-10">
                  <Button onClick={openUploaderFresh} className="h-11 md:h-12 px-6 md:px-8 text-base md:text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full inline-flex items-center gap-2">
                    Try SummerAize
                    <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </div>
            </div>
            <UploadModal
              open={showUploader}
              onClose={() => { setShowUploader(false); setFile(null); setDuplicateCheck(null); setUploading(false); }}
              file={file}
              onFileChange={handleFileChange}
              onUpload={handleUpload}
              uploading={uploading}
              duplicateCheck={duplicateCheck}
              summaryText={duplicateCheck?.summaryText}
              onViewSummary={async () => {
                if (!duplicateCheck?.summaryText) return;
                try {
                  if (duplicateCheck.id) {
                    const { summary } = await summariesAPI.getSummary(duplicateCheck.id);
                    setSelectedSummary(summary || {
                      _id: duplicateCheck.id,
                      originalName: duplicateCheck.originalName || file?.name || 'Uploaded Document',
                      sizeBytes: duplicateCheck.sizeBytes || file?.size || 0,
                      webViewLink: duplicateCheck.webViewLink,
                      webContentLink: duplicateCheck.webContentLink,
                      summaryText: duplicateCheck.summaryText,
                      createdAt: new Date().toISOString(),
                    });
                  } else {
                    setSelectedSummary({
                      _id: undefined,
                      originalName: duplicateCheck.originalName || file?.name || 'Uploaded Document',
                      sizeBytes: duplicateCheck.sizeBytes || file?.size || 0,
                      webViewLink: duplicateCheck.webViewLink,
                      webContentLink: duplicateCheck.webContentLink,
                      summaryText: duplicateCheck.summaryText,
                      createdAt: new Date().toISOString(),
                    });
                  }
                } catch {
                  setSelectedSummary({
                    _id: duplicateCheck.id,
                    originalName: duplicateCheck.originalName || file?.name || 'Uploaded Document',
                    sizeBytes: duplicateCheck.sizeBytes || file?.size || 0,
                    webViewLink: duplicateCheck.webViewLink,
                    webContentLink: duplicateCheck.webContentLink,
                    summaryText: duplicateCheck.summaryText,
                    createdAt: new Date().toISOString(),
                  });
                } finally {
                  setShowUploader(false);
                }
              }}
            />
          </div>
        )}

        {activeTab === 'summaries' && (
          <div
            className="w-full min-h-[60vh]"
            onClick={() => setActiveTab('home')}
          >
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 gap-8">
                <div className="lg:col-span-2">
                <Card 
                  className="glass-card hover-lift animate-slide-up relative" 
                  style={{animationDelay: '0.2s'}}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('home')}
                    className="absolute top-4 right-4 h-8 w-8 p-0 hover:bg-gray-800 rounded-full flex-shrink-0 text-gray-300 z-10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <CardHeader className="text-center pb-4 md:pb-6">
                    <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-3 md:mb-4">
                      <FileText className="h-6 w-6 md:h-8 md:w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl md:text-2xl font-bold gradient-text">
                      Your Summaries
                    </CardTitle>
                    <CardDescription className="text-gray-300 text-sm md:text-lg">
                      View and manage your document summaries
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-purple-600" />
                          <p className="text-gray-300">Loading your summaries...</p>
                        </div>
                      </div>
                    ) : summaries.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-24 h-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
                          <FileText className="h-12 w-12 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-200 mb-2">No summaries yet</h3>
                        <p className="text-gray-400">Upload your first document to get started!</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {summaries.map((summary, index) => (
                          <Card key={summary._id} className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300 hover:shadow-lg animate-fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                            <CardContent className="p-4 md:p-6">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <FileText className="h-5 w-5 text-white" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-gray-100 text-base md:text-lg truncate">
                                      {summary.originalName}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-400 mt-1">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3 md:h-4 md:w-4" />
                                        <span className="whitespace-nowrap">{formatDate(summary.createdAt)}</span>
                                      </span>
                                      <span className="px-2 py-1 bg-gray-700 rounded-full text-xs font-medium text-gray-100">
                                        {formatFileSize(summary.sizeBytes)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                {summary.summaryText ? (
                                  <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-3 md:p-4 rounded-xl border border-gray-600 mb-4">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                                      <h4 className="font-semibold text-gray-100 flex items-center gap-2 text-sm md:text-base">
                                        <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                                        AI Summary Preview
                                      </h4>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => viewFullSummary(summary)}
                                        className="h-8 px-3 text-xs bg-gray-700/50 text-gray-100 border border-gray-600 hover:bg-gray-700/70 hover:text-gray-100 hover:border-gray-500 shrink-0 whitespace-nowrap self-start sm:self-auto"
                                      >
                                        <Maximize2 className="h-3 w-3 mr-1" />
                                        Full View
                                      </Button>
                                    </div>
                                    <p className="text-xs md:text-sm text-gray-200 leading-relaxed line-clamp-3 font-medium">
                                      {summary.summaryText}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 p-3 md:p-4 rounded-xl border border-yellow-700 mb-4">
                                    <div className="flex items-center gap-3">
                                      <Loader2 className="h-4 w-4 md:h-5 md:w-5 text-yellow-400 animate-spin flex-shrink-0" />
                                      <div>
                                        <div className="font-semibold text-yellow-200 text-sm md:text-base">Generating Summary</div>
                                        <div className="text-xs md:text-sm text-yellow-300">AI is processing your document...</div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex flex-row items-stretch gap-2 mt-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleView(summary._id)}
                                  className="h-10 px-3 md:px-4 bg-gray-700/50 text-gray-100 hover:bg-gray-700/70 hover:text-gray-100 border border-gray-600 hover:border-gray-500 flex-1 text-xs md:text-sm"
                                >
                                  <Eye className="h-3 w-3 md:h-4 md:w-4 sm:mr-2" />
                                  <span className="hidden sm:inline md:inline">View</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownload(summary._id)}
                                  className="h-10 px-3 md:px-4 bg-gray-700/50 text-gray-100 hover:bg-gray-700/70 hover:text-gray-100 border border-gray-600 hover:border-gray-500 flex-1 text-xs md:text-sm"
                                >
                                  <Download className="h-3 w-3 md:h-4 md:w-4 sm:mr-2" />
                                  <span className="hidden sm:inline md:inline">Download</span>
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={deletingSummary === summary._id}
                                      className="h-10 px-3 md:px-4 bg-gray-700/50 border border-red-800 text-red-400 hover:text-red-300 hover:bg-red-900/20 hover:border-red-700 flex-1 text-xs md:text-sm"
                                    >
                                      {deletingSummary === summary._id ? (
                                        <Loader2 className="h-3 w-3 md:h-4 md:w-4 sm:mr-2 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3 w-3 md:h-4 md:w-4 sm:mr-2" />
                                      )}
                                      <span className="hidden sm:inline md:inline">Delete</span>
                                    </Button>
                                  </AlertDialogTrigger>
                                    <AlertDialogContent className="glass-card max-w-[90vw] md:max-w-md">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="text-lg md:text-xl font-bold text-red-400">
                                          Delete Document
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="text-sm md:text-base text-gray-300">
                                          Are you sure you want to delete "{summary.originalName}"? This action cannot be undone and will permanently remove the document from both your account and Google Drive.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                        <AlertDialogCancel className="border-gray-300 w-full sm:w-auto">Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleDelete(summary._id)}
                                          className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
                                        >
                                          Delete Document
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
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
          </div>
        )}

      </div>

      {/* Full Summary Modal */}
      {selectedSummary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-2"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            closeFullSummary();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div
            className="max-w-[95vw] md:max-w-5xl max-h-[90vh] overflow-y-auto mx-2 md:mx-auto bg-gray-950 rounded-2xl border border-gray-800 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 md:px-6 pt-4 md:pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 md:gap-3 text-lg md:text-2xl flex-1 min-w-0">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 md:h-6 md:w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="gradient-text truncate">{selectedSummary.originalName}</div>
                    <div className="text-xs md:text-sm font-normal text-gray-400 mt-1">
                      Complete AI-generated summary
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeFullSummary}
                  className="h-8 w-8 p-0 hover:bg-gray-800 rounded-full flex-shrink-0 text-gray-300"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="px-4 md:px-6 pb-4 md:pb-6">
              <div className="py-4 md:py-6">
                <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-4 md:p-6 rounded-xl border border-gray-600">
                  <h4 className="font-bold text-gray-100 mb-3 md:mb-4 text-base md:text-lg flex items-center gap-2">
                    <div className="w-2 h-2 md:w-3 md:h-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                    AI Summary
                  </h4>
                  <div className="prose prose-sm md:prose-lg max-w-none">
                    <p className="text-gray-200 whitespace-pre-wrap leading-relaxed text-sm md:text-base font-medium">
                      {selectedSummary.summaryText}
                    </p>
                  </div>
                </div>
                <div className="mt-4 md:mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3 md:gap-6 text-xs md:text-sm text-gray-400">
                    <span className="flex items-center gap-2">
                      <Clock className="h-3 w-3 md:h-4 md:w-4" />
                      {formatDate(selectedSummary.createdAt)}
                    </span>
                    <span className="px-2 md:px-3 py-1 bg-gray-700 rounded-full text-xs font-medium text-gray-100">
                      {formatFileSize(selectedSummary.sizeBytes)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 md:gap-3 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      onClick={() => handleView(selectedSummary._id)}
                      className="bg-gray-700/50 text-gray-100 hover:bg-gray-700/70 hover:text-gray-100 border border-gray-600 hover:border-gray-500 flex-1 sm:flex-none text-xs md:text-sm px-3 md:px-4"
                    >
                      <Eye className="h-3 w-3 md:h-4 md:w-4 sm:mr-2" />
                      <span className="hidden sm:inline">View Original</span>
                      <span className="sm:hidden">View</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDownload(selectedSummary._id)}
                      className="bg-gray-700/50 text-gray-100 hover:bg-gray-700/70 hover:text-gray-100 border border-gray-600 hover:border-gray-500 flex-1 sm:flex-none text-xs md:text-sm px-3 md:px-4"
                    >
                      <Download className="h-3 w-3 md:h-4 md:w-4 sm:mr-2" />
                      Download
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          disabled={deletingSummary === selectedSummary._id}
                          className="bg-gray-700/50 border border-red-800 text-red-400 hover:text-red-300 hover:bg-red-900/20 hover:border-red-700 flex-1 sm:flex-none text-xs md:text-sm px-3 md:px-4"
                        >
                          {deletingSummary === selectedSummary._id ? (
                            <Loader2 className="h-3 w-3 md:h-4 md:w-4 sm:mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3 md:h-4 md:w-4 sm:mr-2" />
                          )}
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="glass-card max-w-[90vw] md:max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-lg md:text-xl font-bold text-red-400">
                            Delete Document
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-sm md:text-base text-gray-300">
                            Are you sure you want to delete "{selectedSummary.originalName}"? This action cannot be undone and will permanently remove the document from both your account and Google Drive.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                          <AlertDialogCancel className="border-gray-300 w-full sm:w-auto">Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={async () => {
                              await handleDelete(selectedSummary._id);
                              closeFullSummary();
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
                          >
                            Delete Document
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
              <div className="pt-2 md:pt-4 border-t border-gray-800 mt-2 md:mt-4">
                <div className="flex justify-center w-full">
                  <Button
                    onClick={closeFullSummary}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-6 md:px-8 py-2 md:py-3 text-base md:text-lg font-semibold w-full sm:w-auto"
                  >
                    Close Summary
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
