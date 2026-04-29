'use client'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { useTheme } from '@/context/theme-context'
import LoginForm from './LoginForm'
import ForgetPasswordForm from './ForgetPasswordForm'

const Login = () => {
    const searchParams = useSearchParams()
    const mode = searchParams.get('mode')
    const { theme } = useTheme()

    const renderForm = () => {
        switch (mode) {
            case 'forgot-password':
                return <ForgetPasswordForm />
            default:
                return <LoginForm />
        }
    }

    return (
        <main className='flex h-screen w-full dark:text-black'>
            <section className='hidden md:block lg:w-[65vw] h-full relative'>
                <Image
                    src={"/Images/login-banner.jpg"}
                    alt='banner'
                    priority
                    fill
                    className="object-cover"
                />
            </section>

            <section className='bg-[#DBE7F7] flex flex-col items-center justify-center px-6 md:px-12 py-12 w-full lg:w-[35vw] h-full'>
                <div className="flex items-center justify-center w-full mb-4">
                    <Image
                        src={theme === "dark" ? "/Images/logo.svg" : "/Images/logo.svg"}
                        height={60}
                        width={60}
                        alt="logo"
                    />
                    <Image
                        src={theme === "dark" ? "/Images/logo-text.svg" : "/Images/logo-text.svg"}
                        height={100}
                        width={100}
                        alt="logo-text"
                        className="ml-2 mt-2"
                    />
                </div>
                <div className="w-full">
                    {renderForm()}
                </div>
            </section>
        </main>
    )
}

export default Login