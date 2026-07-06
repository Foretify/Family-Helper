import RegisterForm from '../components/Auth/RegisterForm'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🏠</div>
          <h1 className="text-2xl font-bold text-gray-800">Join Family Helper</h1>
          <p className="text-gray-500 text-sm mt-1">Create a family account</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  )
}
