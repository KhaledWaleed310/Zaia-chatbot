import { Fragment, useState } from 'react';
import { Dialog, Transition, Tab } from '@headlessui/react';
import { XMarkIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface EmbedCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatbotId: string;
  chatbotName: string;
}

export default function EmbedCodeModal({
  isOpen,
  onClose,
  chatbotId,
  chatbotName,
}: EmbedCodeModalProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const baseUrl = window.location.origin;

  const embedCodes = [
    {
      name: 'Script Tag',
      description: 'Add this script to your HTML',
      code: `<!-- ZAIA Chatbot Widget -->
<script>
  window.zaiaConfig = {
    chatbotId: '${chatbotId}',
    position: 'bottom-right',
    theme: 'light'
  };
</script>
<script src="${baseUrl}/widget.js" defer></script>`,
    },
    {
      name: 'React Component',
      description: 'Use in React applications',
      code: `import { ZaiaChatbot } from '@zaia/react-widget';

function App() {
  return (
    <div>
      {/* Your app content */}
      <ZaiaChatbot
        chatbotId="${chatbotId}"
        position="bottom-right"
        theme="light"
      />
    </div>
  );
}`,
    },
    {
      name: 'iframe',
      description: 'Embed as an iframe',
      code: `<iframe
  src="${baseUrl}/chat/${chatbotId}"
  width="100%"
  height="600"
  frameborder="0"
  allow="clipboard-write"
  title="${chatbotName}"
></iframe>`,
    },
    {
      name: 'API Endpoint',
      description: 'Direct API integration',
      code: `// POST request to send a message
fetch('${baseUrl}/api/v1/chatbots/${chatbotId}/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'Hello!',
    session_id: 'unique-session-id'
  })
})
.then(res => res.json())
.then(data => console.log(data));`,
    },
  ];

  const copyToClipboard = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 w-full sm:mt-0">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold leading-6 text-gray-900 dark:text-white"
                    >
                      Embed Chatbot: {chatbotName}
                    </Dialog.Title>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Choose how you want to integrate this chatbot into your application
                    </p>

                    <Tab.Group as="div" className="mt-6">
                      <Tab.List className="flex space-x-1 rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
                        {embedCodes.map((item, index) => (
                          <Tab
                            key={index}
                            className={({ selected }) =>
                              clsx(
                                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                                'ring-white ring-opacity-60 ring-offset-2 ring-offset-primary-400 focus:outline-none focus:ring-2',
                                selected
                                  ? 'bg-white dark:bg-gray-800 text-primary-700 dark:text-primary-400 shadow'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-white/[0.12] hover:text-gray-900 dark:hover:text-white'
                              )
                            }
                          >
                            {item.name}
                          </Tab>
                        ))}
                      </Tab.List>
                      <Tab.Panels className="mt-4">
                        {embedCodes.map((item, index) => (
                          <Tab.Panel
                            key={index}
                            className="rounded-lg bg-white dark:bg-gray-800 p-3"
                          >
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {item.description}
                            </p>
                            <div className="relative">
                              <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                                <code>{item.code}</code>
                              </pre>
                              <button
                                onClick={() => copyToClipboard(item.code, index)}
                                className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
                                title="Copy to clipboard"
                              >
                                {copiedIndex === index ? (
                                  <CheckIcon className="h-4 w-4 text-green-400" />
                                ) : (
                                  <ClipboardDocumentIcon className="h-4 w-4 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </Tab.Panel>
                        ))}
                      </Tab.Panels>
                    </Tab.Group>
                  </div>
                </div>

                <div className="mt-5 sm:mt-6">
                  <button
                    type="button"
                    className="btn btn-primary w-full sm:w-auto"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
