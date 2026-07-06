import axios from 'axios';

export const cloudinaryConfig = {
  cloudName: 'dc4m93dhq',
  uploadPreset: 'esurat_unsigned',
};

export const uploadToCloudinary = async (uri: string, folder: string) => {
  try {
    const formData = new FormData();
    
    const filename = uri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri: uri,
      name: filename,
      type: type,
    } as any);
    
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    formData.append('folder', folder);

    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return {
      url: res.data.secure_url,
      publicId: res.data.public_id,
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};