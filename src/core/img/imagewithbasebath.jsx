import React from "react";
import { image_path } from "../../environment";

const isCompleteImagePath = (src) =>
  /^(https?:)?\/\//i.test(src) || /^(data|blob):/i.test(src);

const buildImageSrc = (src) => {
  if (!src) {
    return "";
  }

  const source = String(src);

  if (isCompleteImagePath(source)) {
    return source;
  }

  const basePath = String(image_path || "");
  const cleanSource = source.replace(/^\.\//, "").replace(/^\/+/, "");

  if (!basePath || basePath === "/") {
    return `/${cleanSource}`;
  }

  return `${basePath.replace(/\/+$/, "")}/${cleanSource}`;
};

const ImageWithBasePath = ({
  className,
  src,
  alt = "",
  height,
  width,
  id,
  loading = "lazy",
  decoding = "async",
  ...rest
}) => {
  return (
    <img
      {...rest}
      className={className}
      src={buildImageSrc(src)}
      height={height}
      alt={alt}
      width={width}
      id={id}
      loading={loading}
      decoding={decoding}
    />
  );
};

export default ImageWithBasePath;
