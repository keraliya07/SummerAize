import { useEffect, useRef } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'

const UploadModal = ({ open, onClose, file, onFileChange, onUpload, uploading, duplicateCheck, onViewSummary }) => {
  const overlayRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <Motion.div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-xl md:rounded-2xl shadow-lg p-4 md:p-8 w-full max-w-xl mx-2 md:mx-4 max-h-[90vh] overflow-y-auto"
          >
            <Card className="bg-transparent border-0 shadow-none">
              <CardHeader className="text-center pb-4 md:pb-6">
                <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mb-3 md:mb-4">
                  <Upload className="h-6 w-6 md:h-8 md:w-8 text-white" />
                </div>
                <CardTitle className="text-xl md:text-2xl font-bold text-white">Upload File</CardTitle>
                <CardDescription className="text-sm md:text-base text-gray-200/90">Get an AI-powered summary of your PDF or Word document.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="file" className="text-sm font-semibold text-white">Choose File</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={onFileChange}
                    className="w-full h-12 bg-gray-800/50 border-white/30 focus:border-purple-500 focus:ring-purple-500/20 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-gray-100 hover:file:bg-gray-600"
                  />
                </div>
                {file && (
                  <div className="p-3 md:p-4 bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-xl border border-gray-700/60">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 md:h-5 md:w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-100 text-sm md:text-base truncate">{file.name}</div>
                        <div className="text-xs md:text-sm text-gray-300">{(file.size/1024/1024).toFixed(2)} MB</div>
                      </div>
                    </div>
                  </div>
                )}
                {duplicateCheck && !duplicateCheck.summaryText && (
                  <div className={`p-3 md:p-4 rounded-xl border ${
                    duplicateCheck.isDuplicate
                      ? 'bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-yellow-700'
                      : 'bg-gradient-to-r from-emerald-900/10 to-emerald-800/10 border-emerald-700'
                  }`}>
                    <div className="flex items-center gap-2 md:gap-3">
                      {duplicateCheck.isDuplicate ? (
                        <>
                          <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-yellow-600 flex-shrink-0" />
                          <div>
                            <div className="font-semibold text-yellow-800 text-sm md:text-base">Duplicate Detected</div>
                            <div className="text-xs md:text-sm text-yellow-700">This document was uploaded before</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-green-300 flex-shrink-0" />
                          <div>
                            <div className="font-semibold text-green-300 text-sm md:text-base">Ready to Upload</div>
                            <div className="text-xs md:text-sm text-green-400">Document is unique and ready for processing</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                {duplicateCheck?.summaryText && (
                  <div className="space-y-3 md:space-y-4 p-3 md:p-4 rounded-xl border bg-gradient-to-r from-gray-800/60 to-gray-700/60 border-gray-700/60">
                    <div className="flex items-start justify-between mb-1">
                      <div className="font-semibold text-gray-100 flex items-center gap-2 text-sm md:text-base">
                        <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex-shrink-0"></div>
                        <span className="truncate max-w-[60vw] md:max-w-[55vw]">{duplicateCheck.originalName || file?.name || 'Uploaded Document'}</span>
                      </div>
                    </div>
                    <p className="text-xs md:text-sm text-gray-200 leading-relaxed whitespace-pre-wrap line-clamp-3">
                      {duplicateCheck.summaryText}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                      {onViewSummary && (
                        <Button onClick={onViewSummary} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white w-full sm:w-auto text-sm md:text-base">View Summary</Button>
                      )}
                      <Button onClick={onClose} variant="outline" className="bg-gray-800/60 w-full sm:w-auto text-sm md:text-base">Close</Button>
                    </div>
                  </div>
                )}
                {!duplicateCheck?.summaryText && (
                  <Button
                    onClick={onUpload}
                    className="w-full h-11 md:h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg text-sm md:text-base"
                    disabled={!file || uploading}
                  >
                    {uploading ? (
                      <div className="inline-flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
                        Uploading...
                      </div>
                    ) : (
                      <div className="inline-flex items-center">
                        <Upload className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                        Upload & Summarize
                      </div>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  )
}

export default UploadModal


