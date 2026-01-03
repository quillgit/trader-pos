import { Link } from 'react-router-dom';
import { Clock, Calculator } from 'lucide-react';

export default function HRISDashboard() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">HRIS / Payroll</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link to="/hris/attendance" className="p-6 bg-white rounded-lg border shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                    <div className="bg-blue-100 p-4 rounded-full text-blue-600">
                        <Clock className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold">Attendance</h3>
                        <p className="text-gray-500">Check In / Check Out and view logs</p>
                    </div>
                </Link>

                <Link to="/hris/payroll" className="p-6 bg-white rounded-lg border shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                    <div className="bg-purple-100 p-4 rounded-full text-purple-600">
                        <Calculator className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold">Payroll Processor</h3>
                        <p className="text-gray-500">Calculate wages, allowances, and deductions</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
