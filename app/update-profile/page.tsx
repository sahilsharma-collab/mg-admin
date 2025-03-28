import React from 'react'
import Section1 from './components/Section1'
import Section2 from './components/Section2'

const UpdateProfilePage = () => {
  return (
    <main className="container-padding">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-2xl my-3">Your Profile</h1>
      </div>
      <div className='flex gap-5'>
        <Section1 />
        <Section2 />
      </div>
    </main>
  )
}

export default UpdateProfilePage
