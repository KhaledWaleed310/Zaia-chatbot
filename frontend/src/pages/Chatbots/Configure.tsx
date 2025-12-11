import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { api } from '@/api/client';
import { Chatbot, KnowledgeBase, PaginatedResponse } from '@/types';

export default function ChatbotsConfigure() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    knowledge_base_id: '',
    model_name: 'gpt-3.5-turbo',
    temperature: 0.7,
    max_tokens: 500,
    system_prompt: 'You are a helpful AI assistant. Answer questions based on the provided context.',
    top_k: 5,
  });

  // Fetch chatbot if editing
  const { data: chatbot } = useQuery<Chatbot>({
    queryKey: ['chatbot', id],
    queryFn: async () => {
      const response = await api.chatbots.get(id!);
      return response.data;
    },
    enabled: isEditMode,
  });

  // Fetch knowledge bases
  const { data: kbsData } = useQuery<PaginatedResponse<KnowledgeBase>>({
    queryKey: ['knowledge-bases'],
    queryFn: async () => {
      const response = await api.knowledgeBases.list();
      return response.data;
    },
  });

  // Populate form with chatbot data when editing
  useEffect(() => {
    if (chatbot) {
      setFormData({
        name: chatbot.name,
        description: chatbot.description,
        knowledge_base_id: chatbot.knowledge_base_id,
        model_name: chatbot.model_name,
        temperature: chatbot.temperature,
        max_tokens: chatbot.max_tokens,
        system_prompt: chatbot.system_prompt,
        top_k: chatbot.top_k,
      });
    }
  }, [chatbot]);

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.chatbots.create(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbots'] });
      navigate('/chatbots');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      return api.chatbots.update(id!, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbots'] });
      queryClient.invalidateQueries({ queryKey: ['chatbot', id] });
      navigate('/chatbots');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value,
    }));
  };

  const models = [
    { value: 'gpt-4', label: 'GPT-4 (Most capable)' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Fast & cost-effective)' },
    { value: 'claude-3-opus', label: 'Claude 3 Opus (Powerful)' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet (Balanced)' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/chatbots"
          className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Chatbots
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isEditMode ? 'Edit Chatbot' : 'Create New Chatbot'}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {isEditMode
            ? 'Update your chatbot configuration'
            : 'Configure and deploy a new AI chatbot'}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Basic Information
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="label">
                Chatbot Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="input"
                placeholder="e.g., Customer Support Bot"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="description" className="label">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="textarea"
                placeholder="Describe what this chatbot does..."
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="knowledge_base_id" className="label">
                Knowledge Base
              </label>
              <select
                id="knowledge_base_id"
                name="knowledge_base_id"
                value={formData.knowledge_base_id}
                onChange={handleChange}
                required
                className="input"
              >
                <option value="">Select a knowledge base</option>
                {kbsData?.items
                  .filter((kb) => kb.status === 'ready')
                  .map((kb) => (
                    <option key={kb.id} value={kb.id}>
                      {kb.name} ({kb.document_count} documents)
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Select the knowledge base this chatbot will use to answer questions
              </p>
            </div>
          </div>
        </div>

        {/* Model Configuration */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Model Configuration
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="model_name" className="label">
                Language Model
              </label>
              <select
                id="model_name"
                name="model_name"
                value={formData.model_name}
                onChange={handleChange}
                className="input"
              >
                {models.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="temperature" className="label">
                Temperature: {formData.temperature}
              </label>
              <input
                type="range"
                id="temperature"
                name="temperature"
                min="0"
                max="1"
                step="0.1"
                value={formData.temperature}
                onChange={handleChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Lower = more focused, Higher = more creative
              </p>
            </div>
            <div>
              <label htmlFor="max_tokens" className="label">
                Max Tokens
              </label>
              <input
                type="number"
                id="max_tokens"
                name="max_tokens"
                value={formData.max_tokens}
                onChange={handleChange}
                min="50"
                max="4000"
                step="50"
                className="input"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Maximum response length
              </p>
            </div>
            <div>
              <label htmlFor="top_k" className="label">
                Top K Results
              </label>
              <input
                type="number"
                id="top_k"
                name="top_k"
                value={formData.top_k}
                onChange={handleChange}
                min="1"
                max="20"
                className="input"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Number of relevant documents to retrieve
              </p>
            </div>
          </div>
        </div>

        {/* System Prompt */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            System Prompt
          </h2>
          <div>
            <label htmlFor="system_prompt" className="label">
              Instructions for the AI
            </label>
            <textarea
              id="system_prompt"
              name="system_prompt"
              value={formData.system_prompt}
              onChange={handleChange}
              rows={6}
              className="textarea font-mono text-sm"
              placeholder="You are a helpful assistant..."
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Define how the AI should behave and respond to users. This instruction guides
              all responses.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link to="/chatbots" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="btn btn-primary"
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'Saving...'
              : isEditMode
              ? 'Update Chatbot'
              : 'Create Chatbot'}
          </button>
        </div>
      </form>
    </div>
  );
}
