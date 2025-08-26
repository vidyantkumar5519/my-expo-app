import { View, Text } from 'react-native'
import React from 'react'
import {images} from "@/constants/images";
const index = () => {
  return (
    <View>
     <Image source={images.bg} />
    </View>
  )
}

export default index