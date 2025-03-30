"use client";
import React, { useState } from 'react';
import { useUserProfile } from '@/context/UserProfileContext';
import EditProfileModal from './EditProfileModal';

const Section1 = () => {
  const { user, loading } = useUserProfile();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  if (loading && !user) {
    return (
      <section className='w-1/3 rounded-lg border text-card-foreground shadow-sm p-4 md:p-7 border-[#00000033] dark:border-[#FFFFFF33]'>
        <div className='flex flex-col items-center justify-center h-64'>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0ABAB5]"></div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className='w-1/3 rounded-lg border text-card-foreground shadow-sm p-4 md:p-7 border-[#00000033] dark:border-[#FFFFFF33]'>
        <div className='flex flex-col'>
          <div className='w-full flex justify-center'>
            <div className='w-36 h-36 rounded-full border-4 border-[#0ABAB5] mb-4 bg-gray-300 overflow-hidden flex'>
              <img
                src={user?.imgUrl || "/Images/avatar.png"}
                alt="Profile"
                className='w-full h-full object-cover'
              />
            </div>
          </div>

          <div className='text-start mb-6 space-y-3'>
            <h2 className='font-semibold'>Name: <span className='font-normal'>{user?.name || 'Not provided'}</span></h2>
            <h2 className='font-semibold'>Phone: <span className='font-normal'>
              {user?.countryCode ? `${user.countryCode} ` : ''}{user?.phone || 'Not provided'}
            </span></h2>
            <h2 className='font-semibold'>City: <span className='font-normal'>{user?.city || 'Not provided'}</span></h2>
          </div>

          <div className='w-full flex justify-center text-sm'>
            <button
              onClick={handleOpenModal}
              className="bg-[#0ABAB5] hover:bg-[#09a6a1] px-7 py-2 rounded-full text-white font-medium transition-colors cursor-pointer mt-3"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </section>

      <EditProfileModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
};

export default Section1;