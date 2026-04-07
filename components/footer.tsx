"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Facebook, Instagram, Twitter, Youtube, PawPrint } from "lucide-react"

export default function Footer() {
  const [year, setYear] = useState<number>()

  useEffect(() => {
    setYear(new Date().getFullYear())
  }, [])
  return (
    <footer className="bg-muted" data-testid="footer">
      <div className="container px-4 py-12 mx-auto">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center space-x-2">
              <PawPrint className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">PetPals</span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              What your pet needs, when they need it. Premium products for cats and dogs with same-day delivery.
            </p>
            <div className="flex mt-6 space-x-4">
              <Link href="#" className="text-muted-foreground hover:text-primary" data-testid="footer-social-facebook">
                <Facebook className="h-5 w-5" />
                <span className="sr-only">Facebook</span>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary" data-testid="footer-social-instagram">
                <Instagram className="h-5 w-5" />
                <span className="sr-only">Instagram</span>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary" data-testid="footer-social-twitter">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary" data-testid="footer-social-youtube">
                <Youtube className="h-5 w-5" />
                <span className="sr-only">YouTube</span>
              </Link>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Shop</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/shop?category=toys" className="text-sm text-muted-foreground hover:text-primary" data-testid="footer-link-toys">
                  Pet Toys
                </Link>
              </li>
              <li>
                <Link href="/shop?category=food" className="text-sm text-muted-foreground hover:text-primary" data-testid="footer-link-food">
                  Pet Food
                </Link>
              </li>
              <li>
                <Link href="/shop?category=supplements" className="text-sm text-muted-foreground hover:text-primary" data-testid="footer-link-supplements">
                  Supplements
                </Link>
              </li>
              <li>
                <Link href="/shop?pet=cat" className="text-sm text-muted-foreground hover:text-primary" data-testid="footer-link-cat-products">
                  Cat Products
                </Link>
              </li>
              <li>
                <Link href="/shop?pet=dog" className="text-sm text-muted-foreground hover:text-primary" data-testid="footer-link-dog-products">
                  Dog Products
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Company</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-primary" data-testid="footer-link-about">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-sm text-muted-foreground hover:text-primary" data-testid="footer-link-careers">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-sm text-muted-foreground hover:text-primary" data-testid="footer-link-blog">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary" data-testid="footer-link-contact">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Customer Service</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/help" className="text-sm text-muted-foreground hover:text-primary" data-testid="footer-link-help">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="text-sm text-muted-foreground hover:text-primary" data-testid="footer-link-shipping">
                  Shipping & Delivery
                </Link>
              </li>
              <li>
                <Link href="/returns" className="text-sm text-muted-foreground hover:text-primary" data-testid="footer-link-returns">
                  Returns & Refunds
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary" data-testid="footer-link-contact-us">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/wishlist" className="text-sm text-muted-foreground hover:text-primary" data-testid="footer-link-wishlist">
                  Wishlist
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary" data-testid="footer-link-privacy">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary" data-testid="footer-link-terms">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-8 mt-8 border-t">
            <p className="text-xs text-muted-foreground">
            &copy; {year ?? "—"} PetPals. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
