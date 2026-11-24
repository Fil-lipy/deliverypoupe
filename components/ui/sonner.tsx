'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      position="top-center"
      duration={2000}
      closeButton
      style={{ zIndex: 99999 }}
      toastOptions={{
        style: {
          background: '#ffffff',
          color: '#1A1A1A',
          border: '1px solid #E5E7EB',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          opacity: 1,
        },
        classNames: {
          toast:
            'group toast !bg-white !text-[#1A1A1A] !border !border-gray-200 !shadow-xl !opacity-100',
          title: 'font-semibold',
          description: 'group-[.toast]:text-[#666666]',
          actionButton:
            'group-[.toast]:bg-[#CD0301] group-[.toast]:text-white',
          cancelButton:
            'group-[.toast]:bg-gray-100 group-[.toast]:text-[#666666]',
          success: '!bg-white !text-[#1A1A1A]',
          error: '!bg-white !text-[#CD0301]',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
