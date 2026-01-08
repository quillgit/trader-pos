import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, FileText, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// @ts-ignore
import proposalContent from '../../PROPOSAL_PENAWARAN.md?raw';

const ImagePlaceholder = ({ alt }: { alt: string }) => (
    <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-400 my-4 w-full h-48 print:border-gray-200">
        <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
        <span className="text-sm font-medium">{alt}</span>
        <span className="text-xs mt-1 opacity-70">(Screenshot Placeholder)</span>
    </div>
);

export default function Proposal() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex items-center justify-between">
                    <button 
                        onClick={() => navigate(-1)}
                        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back
                    </button>
                    
                    <div className="flex gap-2">
                        <button 
                            onClick={() => window.print()}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
                        >
                            <FileText className="w-4 h-4" />
                            Print / Save PDF
                        </button>
                    </div>
                </div>

                <div className="bg-white shadow-lg rounded-xl p-8 sm:p-12 print:shadow-none print:p-0">
                    <article className="prose prose-slate prose-lg max-w-none prose-headings:text-gray-800 prose-a:text-blue-600 hover:prose-a:text-blue-500 prose-img:rounded-xl prose-img:shadow-md prose-table:border-collapse prose-table:w-full prose-th:bg-gray-100 prose-th:p-4 prose-td:p-4 prose-td:border prose-th:border-gray-300 prose-td:border-gray-200">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                img: ({ node, ...props }) => <ImagePlaceholder alt={props.alt || ''} />
                            }}
                        >
                            {proposalContent}
                        </ReactMarkdown>
                    </article>
                </div>

                <div className="mt-8 text-center text-gray-500 text-sm print:hidden">
                    <p>© {new Date().getFullYear()} TraderPOS. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}
