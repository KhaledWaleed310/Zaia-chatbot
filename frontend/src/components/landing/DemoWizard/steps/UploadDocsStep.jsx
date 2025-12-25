import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Link, Check, Loader2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDemoWizard } from '../index';

const INITIAL_FILES = [
  { name: 'product-docs.pdf', size: '2.4 MB', status: 'completed' },
  { name: 'faq-guide.pdf', size: '856 KB', status: 'completed' }
];

export const UploadDocsStep = () => {
  const { currentStepData } = useDemoWizard();
  const [files, setFiles] = useState(INITIAL_FILES);
  const [isDragging, setIsDragging] = useState(false);

  const StepIcon = currentStepData.icon;

  // Simulate adding a file
  const handleDemoUpload = () => {
    const newFile = {
      name: `document-${files.length + 1}.pdf`,
      size: '1.2 MB',
      status: 'processing'
    };
    setFiles([...files, newFile]);
  };

  // Simulate processing completion for new files
  useEffect(() => {
    const processingFile = files.find((f) => f.status === 'processing');
    if (processingFile) {
      const timer = setTimeout(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.name === processingFile.name ? { ...f, status: 'completed' } : f
          )
        );
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [files]);

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Left: Upload Zone */}
      <div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 mb-4">
            <StepIcon className="w-4 h-4 mr-2" />
            {currentStepData.estimatedTime}
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            {currentStepData.title}
          </h2>

          <p className="text-lg text-gray-600 mb-8">{currentStepData.description}</p>
        </motion.div>

        {/* Drop Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          onDrop={() => setIsDragging(false)}
          onClick={handleDemoUpload}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 hover:border-green-400 hover:bg-green-50/50'
          }`}
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-lg font-medium text-gray-900 mb-2">
            Drop files here or click to upload
          </p>
          <p className="text-sm text-gray-500">
            Supports PDF, DOCX, TXT, CSV (max 10MB each)
          </p>
        </motion.div>

        {/* Website URL Option */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-500">or import from URL</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input placeholder="https://yourwebsite.com" className="pl-11 h-12" />
            </div>
            <Button variant="outline" className="h-12 px-6">
              <Plus className="w-4 h-4 mr-2" />
              Import
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Right: File List */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border shadow-sm p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">
            Knowledge Base ({files.length} files)
          </h3>
          <span className="text-sm text-green-600 font-medium">
            {files.filter((f) => f.status === 'completed').length} ready
          </span>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {files.map((file, index) => (
              <motion.div
                key={file.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{file.size}</p>
                  </div>
                </div>

                {file.status === 'processing' ? (
                  <div className="flex items-center text-amber-600">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-sm">Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center text-green-600">
                    <Check className="w-5 h-5 mr-2" />
                    <span className="text-sm">Ready</span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* AI Learning indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
            <div>
              <p className="font-medium text-gray-900">AI is learning your content</p>
              <p className="text-sm text-gray-600">
                Your chatbot will answer questions based on these documents
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default UploadDocsStep;
