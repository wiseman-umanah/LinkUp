import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes, FaSync } from "react-icons/fa";
import ReactCrop, { convertToPixelCrop, type PixelCrop, type PercentCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { countChars, generateSlugValue, sanitizeSlug, validateSlug } from "../utils/utils";

interface PaymentLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: {
    name: string;
    description: string;
    amountHbar: number;
    successMessage: string;
    redirectUrl?: string;
    slug: string;
    imageBase64?: string | null;
    imageMimeType?: string | null;
  }) => Promise<void>;
}

const MAX_DESCRIPTION_LENGTH = 255;
const MAX_SUCCESS_MESSAGE_LENGTH = 50;
const MAX_NAME_LENGTH = 50;
const MIN_SLUG_LENGTH = 5;
const MAX_SLUG_LENGTH = 20;
const AMOUNT_INPUT_PATTERN = /^\d*(?:\.\d*)?$/;
const BASE_PAYMENT_PATH = typeof window !== "undefined" ? `${window.location.origin}/payment/` : "/payment/";
const INITIAL_CROP: PercentCrop = {
  unit: "%",
  width: 100,
  height: 100,
  x: 0,
  y: 0,
};



const PaymentLinkModal: React.FC<PaymentLinkModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [redirectLink, setRedirectLink] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("Thank you");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [crop, setCrop] = useState<PercentCrop>({ ...INITIAL_CROP });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [croppedFile, setCroppedFile] = useState<File | null>(null);
  const [imageStage, setImageStage] = useState<"idle" | "cropping" | "preview">("idle");
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [productNameError, setProductNameError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [successMessageError, setSuccessMessageError] = useState<string | null>(null);
  const [amountHbar, setAmountHbar] = useState("1");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const wordCount = useMemo(() => countChars(description), [description]);

  const productNameWordCount = useMemo(() => countChars(productName), [productName]);

  const successWordCount = useMemo(() => countChars(successMessage), [successMessage]);

  useEffect(() => {
    if (isOpen) {
      setProductName("");
      setDescription("");
      setRedirectLink("");
      setImageFile(null);
      setImagePreviewUrl(null);
      setSuccessMessage("Thank you");
    setAmountHbar("1");
      const initialSlug = generateSlugValue(MAX_SLUG_LENGTH);
      setSlug(initialSlug);
      setSlugError(validateSlug(initialSlug, MIN_SLUG_LENGTH, MAX_SLUG_LENGTH));
      setCrop({ ...INITIAL_CROP });
      setCompletedCrop(null);
      setCroppedFile(null);
      setFinalImageUrl(null);
      setImageStage("idle");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      setCompletedCrop(null);
      setCroppedFile(null);
      setImageStage("idle");
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);
    setImageStage("cropping");

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  useEffect(() => {
    return () => {
      if (finalImageUrl) {
        URL.revokeObjectURL(finalImageUrl);
      }
    };
  }, [finalImageUrl]);

  useEffect(() => {
    if (!imageElementRef.current || !canvasRef.current) {
      setCroppedFile(imageFile);
      return;
    }

    if (
      !completedCrop ||
      completedCrop.width <= 0 ||
      completedCrop.height <= 0
    ) {
      setCroppedFile(imageFile);
      return;
    }

    const image = imageElementRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const pixelRatio = window.devicePixelRatio || 1;
    const cropX = Math.round(completedCrop.x);
    const cropY = Math.round(completedCrop.y);
    const cropWidth = Math.round(completedCrop.width);
    const cropHeight = Math.round(completedCrop.height);

    if (cropWidth <= 0 || cropHeight <= 0) {
      setCroppedFile(imageFile);
      return;
    }

    canvas.width = cropWidth * pixelRatio;
    canvas.height = cropHeight * pixelRatio;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    canvas.toBlob((blob) => {
      if (!blob) return;
      const filename = imageFile?.name ?? "cropped-image.jpg";
      setCroppedFile(new File([blob], filename, { type: blob.type }));
    }, imageFile?.type ?? "image/jpeg");
  }, [completedCrop, imageFile]);

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
	const value = event.target.value;
	setDescription(value);

	if (value.length < 3) {
		setDescriptionError("Description must be at least 3 characters.");
	}else {
		setDescriptionError(null);
	}
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
	if (event.target.value.length < 3) {
		setProductNameError("Name must be at least 3 characters.");
	}else {
		setProductNameError(null);
	}
    setProductName(event.target.value);
  };

  const handleSuccessMessageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
	if (event.target.value.length < 3) {
		setSuccessMessageError("Success message must be at least 3 characters.");
	}else {
		setSuccessMessageError(null);
	}
    setSuccessMessage(event.target.value);
  };

  const handleGenerateSlug = () => {
    const newSlug = generateSlugValue(MAX_SLUG_LENGTH);
    setSlug(newSlug);
    setSlugError(validateSlug(newSlug, MIN_SLUG_LENGTH, MAX_SLUG_LENGTH));
  };

  const handleSlugChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeSlug(event.target.value, MAX_SLUG_LENGTH);
    setSlug(sanitized);
    setSlugError(validateSlug(sanitized, MIN_SLUG_LENGTH, MAX_SLUG_LENGTH));
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (finalImageUrl) {
      URL.revokeObjectURL(finalImageUrl);
    }
    setImageFile(file);
    setImageStage(file ? "cropping" : "idle");
    setFinalImageUrl(null);
    setCrop({ ...INITIAL_CROP });
    setCompletedCrop(null);
    setCroppedFile(file ?? null);
  };

  const handleImageLoaded = (event: React.SyntheticEvent<HTMLImageElement>) => {
    imageElementRef.current = event.currentTarget;
    setCrop({ ...INITIAL_CROP });
  };

  const handleUseCroppedImage = () => {
    const fileToUse = croppedFile ?? imageFile;
    if (!fileToUse) return;

    if (finalImageUrl) {
      URL.revokeObjectURL(finalImageUrl);
    }

    const objectUrl = URL.createObjectURL(fileToUse);
    setCroppedFile(fileToUse);
    setFinalImageUrl(objectUrl);
    setImageStage("preview");
  };

  const handleRemoveImage = () => {
    if (finalImageUrl) {
      URL.revokeObjectURL(finalImageUrl);
    }

    setFinalImageUrl(null);
    setImageFile(null);
    setCroppedFile(null);
    setCompletedCrop(null);
    setImagePreviewUrl(null);
    setCrop({ ...INITIAL_CROP });
    setImageStage("idle");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAmountChange = (nextValue: string) => {
    if (nextValue === "" || AMOUNT_INPUT_PATTERN.test(nextValue)) {
      setAmountHbar(nextValue);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const sanitizedSlug = sanitizeSlug(slug, MAX_SLUG_LENGTH);
    if (sanitizedSlug !== slug) {
      setSlug(sanitizedSlug);
    }
    const slugValidationError = validateSlug(sanitizedSlug, MIN_SLUG_LENGTH, MAX_SLUG_LENGTH);
    if (slugValidationError) {
      setSlugError(slugValidationError);
      return;
    }
    const parsedAmount = Number(amountHbar);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setSubmitError("Amount in HBAR must be greater than zero");
      return;
    }
    const selectedImageFile = imageStage === "preview" ? croppedFile : null;
    let imageBase64: string | null = null;
    let imageMimeType: string | null = null;
    if (selectedImageFile) {
      imageBase64 = await fileToBase64(selectedImageFile);
      imageMimeType = selectedImageFile.type ?? null;
    }
    setSlugError(null);
    setSubmitError(null);

    try {
      setSubmitting(true);
      await onCreate({
        name: productName,
        description,
        amountHbar: parsedAmount,
        successMessage,
        redirectUrl: redirectLink || undefined,
        slug: sanitizedSlug,
        imageBase64,
        imageMimeType,
      });
      onClose();
    } catch (err: any) {
      setSubmitError(err?.response?.data?.error ?? "Failed to create payment link. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const portalTarget = typeof document !== "undefined" ? document.body : null;

  if (!isOpen || !portalTarget) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[90vh] max-w-2xl overflow-y-auto rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_40px_110px_-60px_rgba(18,49,220,0.55)] backdrop-blur-xl sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Create payment link</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 transition hover:text-white"
            aria-label="Close"
          >
            <FaTimes size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-200">
              Image of Product/Service (Optional)
            </label>
            {imageStage === "idle" ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className="mt-2 flex h-40 w-full cursor-pointer items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-center text-sm text-slate-400 transition hover:border-indigo-400/60 hover:text-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
              >
                <span>Click to upload image</span>
              </div>
            ) : null}
            {imageStage === "cropping" ? (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm font-medium text-indigo-300 transition hover:text-indigo-200"
                >
                  Choose different image
                </button>
              </div>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelection}
              className="hidden"
            />
            {imageStage === "cropping" && imagePreviewUrl ? (
              <>
                <div className="mt-3 max-h-72 w-full overflow-auto rounded-2xl border border-white/10 bg-slate-950/40 p-2">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(_, percentCrop) => {
                      if (!imageElementRef.current) {
                        setCompletedCrop(null);
                        return;
                      }
                      const pixelCrop = convertToPixelCrop(
                        percentCrop,
                        imageElementRef.current.naturalWidth,
                        imageElementRef.current.naturalHeight
                      );
                      if (pixelCrop.width && pixelCrop.height) {
                        setCompletedCrop(pixelCrop);
                      } else {
                        setCompletedCrop(null);
                      }
                    }}
                    keepSelection
                  >
                    <img
                      ref={imageElementRef}
                      src={imagePreviewUrl}
                      alt="Selected product"
                      onLoad={handleImageLoaded}
                      className="block max-w-none"
                    />
                  </ReactCrop>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleUseCroppedImage}
                    disabled={!croppedFile}
                    className="rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-300"
                  >
                    Use image
                  </button>
                </div>
              </>
            ) : null}
            {imageStage === "preview" && finalImageUrl ? (
                <div className="group relative mx-auto mt-3 max-h-72 w-max overflow-auto rounded-2xl border border-white/10 bg-slate-950/40 p-2">
                <img
                  src={finalImageUrl}
                  alt="Selected product preview"
                  className="block max-w-full object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="pointer-events-none absolute right-3 top-3 flex rounded-full border border-red-400/40 bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-200 opacity-0 shadow transition hover:border-red-400/60 hover:bg-red-500/30 focus-visible:pointer-events-auto focus-visible:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100"
                >
                  Remove image
                </button>
              </div>
            ) : null}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-200">
                Name of Product/Service
              </label>
              <span className="text-xs text-slate-500">{productNameWordCount}/{MAX_NAME_LENGTH} chars</span>
            </div>
            <input
              type="text"
			  minLength={3}
			  maxLength={MAX_NAME_LENGTH}	
              required
              value={productName}
              onChange={handleNameChange}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            {productNameError ? (
              <p className="mt-1 text-xs text-red-300">{productNameError}</p>
            ) : null}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-200">
                Description (Optional, up to 255 words)
              </label>
              <span className="text-xs text-slate-500">{wordCount}/{MAX_DESCRIPTION_LENGTH} chars</span>
            </div>
            <textarea
				minLength={3}
				maxLength={MAX_DESCRIPTION_LENGTH}
              value={description}
              onChange={handleDescriptionChange}
              rows={4}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Describe the product or service..."
            />
			{descriptionError ? (
              <p className="mt-1 text-xs text-red-300">{descriptionError}</p>
            ) : null}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-200">Amount (HBAR)</label>
            </div>
            <input
              type="text"
              inputMode="decimal"
              required
              placeholder="Enter amount in HBAR"
              value={amountHbar}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-200">
                Custom Success Message (Optional)
              </label>
              <span className="text-xs text-slate-500">
                {successWordCount}/{MAX_SUCCESS_MESSAGE_LENGTH} chars
              </span>
            </div>
            <input
              type="text"
			  minLength={3}
			  maxLength={MAX_SUCCESS_MESSAGE_LENGTH}
              value={successMessage}
              onChange={handleSuccessMessageChange}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Thank you"
            />
			{successMessageError ? (
              <p className="mt-1 text-xs text-red-300">{successMessageError}</p>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Payment Link
            </label>
            <div className="mt-2 flex">
              <span className="hidden sm:flex items-center rounded-l-2xl border border-r-0 border-white/10 bg-white/10 px-3 text-sm text-slate-300">
                {BASE_PAYMENT_PATH}
              </span>
              <input
                type="text"
                value={slug}
                onChange={handleSlugChange}
                className={`flex-1 rounded-none border bg-white/5 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 ${slugError ? "border-red-500/80 focus:border-red-500/80 focus:ring-red-500/40" : "border-white/10 focus:border-indigo-400/60 focus:ring-indigo-500/30"}`}
                minLength={MIN_SLUG_LENGTH}
                maxLength={MAX_SLUG_LENGTH}
                aria-invalid={Boolean(slugError)}
                autoComplete="off"
                placeholder="custom-link"
              />
              <button
                type="button"
                onClick={handleGenerateSlug}
                className="rounded-r-2xl border border-l-0 border-white/10 bg-white/5 px-4 text-slate-300 transition hover:border-indigo-400/40 hover:text-indigo-200"
                aria-label="Generate link"
              >
                <FaSync />
              </button>
            </div>
            {slugError ? (
              <p className="mt-1 text-xs text-red-300">{slugError}</p>
            ) : null}
            <p className="mt-1 text-xs text-slate-500">
              Users will be directed to {BASE_PAYMENT_PATH}
              {slug || "<your-link>"}.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Redirect Link (Optional)
            </label>
            <input
              type="url"
              value={redirectLink}
              onChange={(event) => setRedirectLink(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder="https://example.com/thank-you"
            />
          </div>

          {submitError ? (
            <p className="text-sm text-red-300">{submitError}</p>
          ) : null}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-white/40 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={Boolean(slugError) || submitting}
              className={`rounded-2xl px-5 py-2 text-sm font-semibold transition ${
                slugError || submitting
                  ? "cursor-not-allowed bg-indigo-700/40 text-indigo-200/60"
                  : "bg-gradient-to-r from-indigo-400 via-indigo-500 to-sky-500 text-slate-950 hover:brightness-110"
              }`}
            >
              {submitting ? "Saving…" : "Save link"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    portalTarget
  );
};

export default PaymentLinkModal;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const [, base64] = reader.result.split(",");
        resolve(base64 ?? reader.result);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read error"));
    reader.readAsDataURL(file);
  });
}
