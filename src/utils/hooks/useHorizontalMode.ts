import { useWindowSize } from '@/utils/hooks'
import { isHorizontalMode } from '../tools'
import { useSettingValue } from '@/store/setting/hook'


export default () => {
  const windowSize = useWindowSize()
  const forceLandscapeLayout = useSettingValue('common.forceLandscapeLayout')

  return forceLandscapeLayout || isHorizontalMode(windowSize.width, windowSize.height)
}
