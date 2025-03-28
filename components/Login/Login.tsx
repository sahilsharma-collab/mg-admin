'use client'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import LoginForm from './LoginForm'
import ForgetPasswordForm from './ForgetPasswordForm'

const Login = () => {
    const searchParams = useSearchParams()
    const mode = searchParams.get('mode')

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
                    src={"https://booming-bulls.s3.ap-south-1.amazonaws.com/uploads/f9eabd3d-74f1-4457-a112-5c9a29d448b5.jpg"}
                    alt='banner'
                    priority
                    fill
                    className="object-cover"
                />
            </section>

            <section className='bg-[#DBE7F7] flex flex-col px-6 md:px-12 py-12 w-full lg:w-[35vw] h-full'>
                <div className="flex items-center w-full justify-center mb-4">
                    <Image
                        src={"https://booming-bulls.s3.ap-south-1.amazonaws.com/uploads/a7608b8c-5ac3-4235-b574-23a52d8c8b8d.png"}
                        height={60}
                        width={60}
                        alt="logo"
                    />
                    <Image
                        src={"https://booming-bulls.s3.ap-south-1.amazonaws.com/uploads/fd9da0f9-c93c-44dc-9b61-4bc3a0a5ef17.png"}
                        height={100}
                        width={100}
                        alt="logo-text"
                        className="ml-2 mt-2"
                    />
                </div>
                {renderForm()}
            </section>
        </main>
    )
}

export default Login