import { PrismaClient, Category, Pet, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Create admin user
  const adminPassword = await import('bcrypt').then(b => b.hash('admin123', 10))

  const admin = await prisma.user.upsert({
    where: { email: 'admin@petpals.com' },
    update: {},
    create: {
      email: 'admin@petpals.com',
      password: adminPassword,
      name: 'Admin User',
      role: Role.ADMIN
    }
  })

  console.log('Created admin user:', admin.email)

  // Create customer user
  const customerPassword = await import('bcrypt').then(b => b.hash('customer123', 10))

  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      password: customerPassword,
      name: 'Test Customer',
      role: Role.CUSTOMER
    }
  })

  console.log('Created customer user:', customer.email)

  // Create products
  const products = [
    {
      name: 'Premium Dry Cat Food',
      slug: 'premium-dry-cat-food',
      description: 'High-quality dry food for adult cats with balanced nutrition.',
      price: 24.99,
      image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119',
      category: Category.FOOD,
      pet: Pet.CAT,
      rating: 4.5,
      reviewCount: 128,
      featured: true,
      stock: 50,
      tags: ['food', 'nutrition', 'adult cats']
    },
    {
      name: 'Interactive Cat Toy',
      slug: 'interactive-cat-toy',
      description: 'Engaging toy that stimulates your cat\'s hunting instincts.',
      price: 12.99,
      originalPrice: 16.99,
      image: 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13',
      category: Category.TOYS,
      pet: Pet.CAT,
      rating: 4.8,
      reviewCount: 95,
      isNew: true,
      discount: 20,
      featured: true,
      stock: 35,
      tags: ['toys', 'interactive', 'entertainment']
    },
    {
      name: 'Premium Dog Kibble',
      slug: 'premium-dog-kibble',
      description: 'Complete and balanced nutrition for adult dogs.',
      price: 34.99,
      image: 'https://images.unsplash.com/photo-1743269489028-2c7e359423e3',
      category: Category.FOOD,
      pet: Pet.DOG,
      rating: 4.7,
      reviewCount: 203,
      featured: true,
      stock: 45,
      tags: ['food', 'nutrition', 'adult dogs']
    },
    {
      name: 'Durable Dog Chew Toy',
      slug: 'durable-dog-chew-toy',
      description: 'Long-lasting chew toy designed for aggressive chewers.',
      price: 18.99,
      originalPrice: 22.99,
      image: 'https://images.unsplash.com/photo-1575425186775-b8de9a427e67',
      category: Category.TOYS,
      pet: Pet.DOG,
      rating: 4.6,
      reviewCount: 167,
      discount: 15,
      featured: true,
      stock: 30,
      tags: ['toys', 'durable', 'chew']
    },
    {
      name: 'Cat Immune Support Supplements',
      slug: 'cat-immune-support-supplements',
      description: 'Daily supplements to boost your cat\'s immune system.',
      price: 29.99,
      image: 'https://images.unsplash.com/photo-1606214174585-fe31582dc6ee',
      category: Category.SUPPLEMENTS,
      pet: Pet.CAT,
      rating: 4.3,
      reviewCount: 78,
      isNew: true,
      featured: true,
      stock: 25,
      tags: ['supplements', 'health', 'immune system']
    },
    {
      name: 'Dog Joint Health Supplements',
      slug: 'dog-joint-health-supplements',
      description: 'Support your dog\'s joint health and mobility.',
      price: 32.99,
      image: 'https://images.unsplash.com/photo-1582798358481-d199fb7347bb',
      category: Category.SUPPLEMENTS,
      pet: Pet.DOG,
      rating: 4.5,
      reviewCount: 112,
      featured: true,
      stock: 40,
      tags: ['supplements', 'joint health', 'mobility']
    }
  ]

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: product
    })
  }

  console.log(`Created ${products.length} products`)
  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
