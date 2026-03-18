import { useEffect } from 'react'

export function useProjectTitle() {
  useEffect(() => {
    document.title = '漂流島生存實驗'
  }, [])
}
