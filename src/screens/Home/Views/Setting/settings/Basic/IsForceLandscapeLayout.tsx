import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { createStyle } from '@/utils/tools'
import { memo } from 'react'
import { View } from 'react-native'

import CheckBoxItem from '../../components/CheckBoxItem'

export default memo(() => {
  const t = useI18n()
  const value = useSettingValue('common.forceLandscapeLayout')

  return (
    <View style={styles.content}>
      <CheckBoxItem
        check={value}
        label={t('setting_basic_force_landscape_layout')}
        helpDesc={t('setting_basic_force_landscape_layout_tip')}
        onChange={forceLandscapeLayout => {
          updateSetting({ 'common.forceLandscapeLayout': forceLandscapeLayout })
        }} />
    </View>
  )
})

const styles = createStyle({
  content: {
    marginTop: 5,
    marginBottom: 15,
  },
})
